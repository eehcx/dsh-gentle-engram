import { randomUUID } from 'node:crypto'

type JsonRecord = Record<string, unknown>
type Agent = {
  id?: string
  session?: { requestHeader?: () => { cwd?: string } }
  inject: (message: UserMessage) => void
}
type UserMessage = {
  id: string
  role: 'user'
  content: Array<{ type: 'text'; text: string }>
  source: { kind: 'plugin'; plugin: string }
}
type ToolResult = JsonRecord & { content?: unknown }
type ToolExecution = { agent?: Agent; name: string }
type SessionState = { ready: Promise<boolean>; started: boolean; disposed: boolean }
type ToolRegistry = {
  get: (name: string, agent?: Agent) => unknown
  execute: (input: JsonRecord) => Promise<ToolResult>
}
type PromptRegistry = {
  section: (section: { name: string; order: number; text: string }) => unknown
}
type CordisContext = {
  tools: ToolRegistry
  logger?: { warn: (message: string) => void }
  get: (name: string) => unknown
  on: (event: string, listener: (...args: any[]) => unknown) => unknown
  provide: (name: string, value: unknown) => unknown
}
type Config = {
  serverName?: string
  contextLimit?: number
  captureToolResults?: boolean
}

export const name = 'dsh-gentle-engram'
export const inject = ['tools']

const DEFAULTS: Required<Config> = {
  serverName: 'engram',
  contextLimit: 8000,
  captureToolResults: true,
}

function createInjectedMessage(text: string): UserMessage {
  return {
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'plugin', plugin: name },
  }
}

function sessionIdOf(agent: Agent | undefined): string | undefined {
  return typeof agent?.id === 'string' ? agent.id : undefined
}

function directoryOf(agent: Agent | undefined): string | undefined {
  try {
    const directory = agent?.session?.requestHeader?.()?.cwd
    return typeof directory === 'string' && directory.trim() ? directory : undefined
  } catch {
    return undefined
  }
}

function isToolFailure(result: ToolResult | undefined): boolean {
  return !result || result.isError === true
}

function textOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  const record = value as JsonRecord
  if (typeof record.text === 'string') return record.text
  if (Array.isArray(record.content)) {
    return record.content
      .filter((item): item is JsonRecord => !!item && typeof item === 'object' && (item as JsonRecord).type === 'text')
      .map((item) => typeof item.text === 'string' ? item.text : '')
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function bounded(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 120))}\n...[truncated by dsh-gentle-engram]`
}

export function apply(ctx: CordisContext, rawConfig: Config = {}): void {
  const config = { ...DEFAULTS, ...rawConfig }
  const tools = ctx.tools
  const sessions = new WeakMap<Agent, SessionState>()
  const tails = new WeakMap<Agent, Promise<unknown>>()

  const call = (agent: Agent | undefined, rawName: string, args: JsonRecord): Promise<ToolResult | undefined> => {
    const id = sessionIdOf(agent)
    if (!id || !agent) return Promise.resolve(undefined)
    const publicName = `mcp__${config.serverName}__${rawName}`
    if (!tools.get(publicName, agent)) return Promise.resolve(undefined)
    const operation = async (): Promise<ToolResult> => tools.execute({
      callId: `engram-${randomUUID()}`,
      name: publicName,
      arguments: args,
      agent,
      signal: new AbortController().signal,
    })
    const previous = tails.get(agent) || Promise.resolve()
    const next = previous.catch(() => undefined).then(operation)
    // Keep the coordination tail settled even when the MCP call fails.
    tails.set(agent, next.catch(() => undefined))
    return next.catch((error: unknown) => {
      ctx.logger?.warn(`engram ${rawName} failed for ${id}: ${String(error)}`)
      return undefined
    })
  }

  const callWhenReady = (agent: Agent | undefined, rawName: string, args: JsonRecord): Promise<ToolResult | undefined> => {
    const state = agent ? sessions.get(agent) : undefined
    if (!agent || !state || state.disposed) return Promise.resolve(undefined)
    return state.ready.then((ready) => ready && !state.disposed ? call(agent, rawName, args) : undefined)
  }

  const contextText = async (agent: Agent): Promise<string> => {
    const result = await call(agent, 'mem_context', {})
    return bounded(textOf(result), config.contextLimit)
  }

  ctx.on('agent/session-start', (payload: { agent: Agent }) => {
    const { agent } = payload
    const id = sessionIdOf(agent)
    if (sessions.has(agent)) return
    const directory = directoryOf(agent)
    const state: SessionState = { ready: Promise.resolve(false), started: false, disposed: false }
    sessions.set(agent, state)
    if (!id || !directory) return

    state.ready = call(agent, 'mem_session_start', { id, directory }).then((result) => {
      if (isToolFailure(result)) return false
      state.started = true
      return true
    })

    void state.ready.then(async (ready) => {
      if (!ready || state.disposed) return
      const context = await contextText(agent)
      if (context && !state.disposed) {
        agent.inject(createInjectedMessage(`Relevant persistent Engram context for this session:

${context}`))
      }
    })
  })

  ctx.on('agent/inbox/inserted', (payload: { agent: Agent; message: unknown }) => {
    const state = sessions.get(payload.agent)
    if (!state || state.disposed) return
    const content = textOf(payload.message)
    if (content.length <= 10 || content.includes('Relevant persistent Engram context')) return
    void callWhenReady(payload.agent, 'mem_save_prompt', { content, session_id: sessionIdOf(payload.agent) })
  })

  ctx.on('tools/result', (exec: ToolExecution, result: unknown) => {
    if (!config.captureToolResults || !exec.agent || exec.name.startsWith(`mcp__${config.serverName}__`)) return
    const state = sessions.get(exec.agent)
    if (!state || state.disposed) return
    const output = bounded(textOf(result), 4000)
    if (!output || /password|token|secret/i.test(output)) return
    void callWhenReady(exec.agent, 'mem_capture_passive', {
      content: `## Key Learnings:\n- Tool ${exec.name} returned:\n\n${output}`,
      session_id: sessionIdOf(exec.agent),
      source: 'dsh-tools-result',
    })
  })

  ctx.on('agent/turn-stopping', (payload: { agent: Agent }) => {
    const state = sessions.get(payload.agent)
    if (!state) return tails.get(payload.agent) || undefined
    return state.ready.then(() => tails.get(payload.agent) || undefined)
  })

  ctx.on('agent/disposed', (payload: { agent: Agent }) => {
    const { agent } = payload
    const id = sessionIdOf(agent)
    const state = sessions.get(agent)
    if (!id || !state || state.disposed) return
    state.disposed = true
    void state.ready.then(async (ready) => {
      if (!ready || !state.started) return
      try {
        await call(agent, 'mem_session_summary', {
          content: `## Goal\nPreserve the completed DeepSeek Harness session in Engram.\n\n## Accomplished\n- Session lifecycle and relevant tool activity were captured automatically.\n\n## Next Steps\n- Review the session memories when continuing work.\n\n## Relevant Files\n- Session ${id}`,
          session_id: id,
        })
      } finally {
        await call(agent, 'mem_session_end', { id, summary: 'DeepSeek Harness session ended.' })
      }
    }).finally(() => {
      sessions.delete(agent)
    })
  })

  const systemPrompt = ctx.get('systemPrompt') as PromptRegistry | undefined
  systemPrompt?.section({
    name: 'engram:protocol',
    order: 40,
    text: 'Engram memory is available through the mcp__engram__mem_* tools. At session start use the recovered context; save concise structured observations after meaningful decisions, fixes, and discoveries; use progressive disclosure (search, timeline, full observation); never store secrets or entire noisy tool outputs.',
  })

  ctx.provide('engramMemory', {
    sessionIdOf,
    search: (agent: Agent, query: string) => callWhenReady(agent, 'mem_search', { query }),
    save: (agent: Agent, args: JsonRecord) => callWhenReady(agent, 'mem_save', { ...args, session_id: sessionIdOf(agent) }),
  })
}

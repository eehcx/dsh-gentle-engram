import { randomUUID } from 'node:crypto'
import { Config, resolveConfig, type ConfigInput, type EngramConfig } from './config.ts'
import { losslessJson, type JsonValue } from './json.ts'
import { redactPrivateTags } from './redaction.ts'
import {
  bounded,
  framedMemoryContext,
  passivePayload,
  MEMORY_CONTEXT_INTRO,
  MEMORY_CONTEXT_START,
  MEMORY_CONTEXT_END,
  MEMORY_CONTEXT_BOUNDARY_PATTERN,
  MEMORY_CONTEXT_BOUNDARY_ESCAPE,
  TRUNCATION_MARKER,
} from './capture.ts'
import { PROTOCOL_TEXT } from './protocol.ts'

export { Config } from './config.ts'

type JsonRecord = Record<string, unknown>
type Agent = {
  id?: string
  session?: { requestHeader?: () => { cwd?: string }; header?: { cwd?: string } }
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

export const name = 'dsh-gentle-engram'
export const inject = ['tools']

const CAPTURE_LIMIT = 4000
const REDACTED = '[REDACTED]'

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
    const fromRequest = agent?.session?.requestHeader?.()?.cwd
    if (typeof fromRequest === 'string' && fromRequest.trim()) return fromRequest
  } catch {
    // ignore
  }
  try {
    const fromHeader = agent?.session?.header?.cwd
    if (typeof fromHeader === 'string' && fromHeader.trim()) return fromHeader
  } catch {
    // ignore
  }
  return undefined
}

function isToolFailure(result: ToolResult | undefined): boolean {
  return !result || result.isError === true
}

function isUserOriginatedMessage(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  try {
    const message = value as JsonRecord
    const source = message.source
    return message.role === 'user'
      && !!source
      && typeof source === 'object'
      && Object.hasOwn(source, 'kind')
      && (source as JsonRecord).kind === 'user'
  } catch {
    return false
  }
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

function isTrivialLearning(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.length <= 3 || /^(?:ok(?:ay)?|done|success(?:ful)?|complete(?:d)?|true|false|no output|n\/a|none)[.!?]*$/i.test(trimmed)
}

function keyLearningsFrom(text: string): string | undefined {
  const lines = text.split(/\r?\n/)
  const heading = lines.findIndex((line) => /^#{2,3}\s+(?:Aprendizajes(?:\s+Clave)?|Key\s+Learnings?|Learnings?):?\s*$/i.test(line.trim()))
  if (heading < 0) return undefined

  const learnings: string[] = []
  for (const line of lines.slice(heading + 1)) {
    const trimmed = line.trim()
    if (/^#{1,6}\s/.test(trimmed)) break
    const item = trimmed.match(/^(?:[-*]|\d+[.)])\s+(.+?)\s*$/)?.[1]
    if (item && !isTrivialLearning(item)) learnings.push(item.trim())
  }

  return learnings.length ? `## Key Learnings:\n${learnings.map((item) => `- ${item}`).join('\n')}` : undefined
}

export function apply(ctx: CordisContext, rawConfig: ConfigInput = {}): void {
  const config = resolveConfig(rawConfig)
  const serverName = 'engram'
  const tools = ctx.tools
  const sessions = new WeakMap<Agent, SessionState>()
  const tails = new WeakMap<Agent, Promise<unknown>>()

  const call = (agent: Agent | undefined, rawName: string, args: JsonRecord): Promise<ToolResult | undefined> => {
    const id = sessionIdOf(agent)
    if (!id || !agent) return Promise.resolve(undefined)
    const publicName = `mcp__${serverName}__${rawName}`
    if (!tools.get(publicName, agent)) return Promise.resolve(undefined)
    const operation = async (): Promise<ToolResult> => {
      const result = await tools.execute({
        callId: `engram-${randomUUID()}`,
        name: publicName,
        arguments: args,
        agent,
        signal: new AbortController().signal,
      })
      return losslessJson(result) as ToolResult
    }
    const previous = tails.get(agent) || Promise.resolve()
    const next = previous.catch(() => undefined).then(operation)
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

  const injectRecoveredContext = async (agent: Agent, state: SessionState): Promise<void> => {
    if (!config.ambientMemory) return
    if (state.disposed || !state.started) return
    const context = await contextText(agent)
    if (!context || state.disposed) return
    const framed = framedMemoryContext(context, config.contextLimit)
    if (framed) agent.inject(createInjectedMessage(framed))
  }

  const handleSessionStart = (payload: { agent: Agent; source?: string }) => {
    const { agent, source } = payload
    const id = sessionIdOf(agent)
    const existing = sessions.get(agent)
    if (existing) {
      if (source === 'compact' && !existing.disposed) {
        void existing.ready.then((ready) => ready ? injectRecoveredContext(agent, existing) : undefined).catch((error: unknown) => {
          ctx.logger?.warn(`engram context recovery failed for ${id}: ${String(error)}`)
        })
      }
      return
    }
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
      if (ready) await injectRecoveredContext(agent, state)
    }).catch((error: unknown) => {
      ctx.logger?.warn(`engram context recovery failed for ${id}: ${String(error)}`)
    })
  }

  ctx.on('agent/session-start', handleSessionStart)
  ctx.on('agent/created', handleSessionStart)

  ctx.on('agent/inbox/inserted', (payload: { agent: Agent; message: unknown }) => {
    if (!config.capturePrompts) return
    const state = sessions.get(payload.agent)
    if (!state || state.disposed || !isUserOriginatedMessage(payload.message)) return
    const content = bounded(redactPrivateTags(textOf(payload.message)).trim(), CAPTURE_LIMIT)
    if (content.length <= 10 || content.includes('Relevant persistent Engram context')) return
    void callWhenReady(payload.agent, 'mem_save_prompt', { content, session_id: sessionIdOf(payload.agent) })
  })

  ctx.on('tools/result', (exec: ToolExecution, result: unknown) => {
    if (!config.captureToolResults || !exec.agent || exec.name.startsWith(`mcp__${serverName}__`)) return
    const state = sessions.get(exec.agent)
    if (!state || state.disposed || !result || typeof result !== 'object' || isToolFailure(result as ToolResult)) return
    const rawOutput = redactPrivateTags(textOf(result))
    const output = bounded(rawOutput, CAPTURE_LIMIT)
    if (!output || /password|token|secret/i.test(output)) return
    const content = keyLearningsFrom(output)
    if (!content) return
    const truncatedContent = rawOutput.length > CAPTURE_LIMIT ? `${content}\n${TRUNCATION_MARKER}` : content
    const boundedContent = bounded(redactPrivateTags(truncatedContent), CAPTURE_LIMIT)
    void callWhenReady(exec.agent, 'mem_capture_passive', {
      content: boundedContent,
      session_id: sessionIdOf(exec.agent),
      source: 'dsh-tools-result',
    })
  })

  ctx.on('agent/turn-stopping', (payload: { agent: Agent }) => {
    const { agent } = payload
    const state = sessions.get(agent)
    if (!state) return tails.get(agent) || undefined
    return state.ready.then(() => tails.get(agent) || undefined)
  })

  ctx.on('agent/disposed', (payload: { agent: Agent }) => {
    const { agent } = payload
    const id = sessionIdOf(agent)
    const state = sessions.get(agent)
    if (!id || !state || state.disposed) return
    state.disposed = true
    void state.ready.then(async (ready) => {
      if (!ready || !state.started) return
      await call(agent, 'mem_session_summary', {
        content: `## Goal\nPreserve the completed DeepSeek Harness session in Engram.\n\n## Accomplished\n- Session lifecycle and relevant tool activity were captured automatically.\n\n## Next Steps\n- Review the session memories when continuing work.\n\n## Relevant Files\n- Session ${id}`,
        session_id: id,
      })
      await call(agent, 'mem_session_end', { id, summary: 'DeepSeek Harness session ended.' })
    }).finally(() => {
      sessions.delete(agent)
    })
  })

  const systemPrompt = ctx.get('systemPrompt') as PromptRegistry | undefined
  systemPrompt?.section({
    name: 'engram:protocol',
    order: 40,
    text: PROTOCOL_TEXT,
  })

  try {
    (ctx as any).inject?.(['settings'], (settingsCtx: any) => {
      settingsCtx.settings?.register?.('engram', Config, {
        base: config,
      })
    })
  } catch {
    // optional service
  }

  ctx.provide('engramMemory', {
    sessionIdOf,
    search: (agent: Agent, query: string) => callWhenReady(agent, 'mem_search', { query }),
    save: (agent: Agent, args: JsonRecord) => callWhenReady(agent, 'mem_save', { ...args, session_id: sessionIdOf(agent) }),
  })
}

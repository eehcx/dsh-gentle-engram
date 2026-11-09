import assert from 'node:assert/strict'
import test from 'node:test'

import { apply } from '../dist/index.js'

function createHarness({ execute, config, cwd = '/workspace' } = {}) {
  const listeners = new Map()
  const calls = []
  const injections = []
  const services = new Map()
  const availableTools = new Set()
  const toolExecute = execute || (async () => ({ text: 'ok' }))

  function createAgent(id, directory) {
    return {
      id,
      session: { requestHeader: () => directory ? { cwd: directory } : {} },
      inject(message) {
        injections.push({ agent: this, message })
      },
    }
  }

  const context = {
    tools: {
      get(name) {
        return availableTools.has(name) ? {} : undefined
      },
      execute: async (input) => {
        calls.push(input)
        return toolExecute(input)
      },
    },
    on(event, listener) {
      listeners.set(event, listener)
    },
    get() {
      return undefined
    },
    provide(name, value) {
      services.set(name, value)
    },
  }

  apply(context, config)

  return {
    agent: createAgent('session-1', cwd),
    calls,
    emit(event, ...args) {
      return listeners.get(event)?.(...args)
    },
    enable(...names) {
      names.forEach((name) => availableTools.add(name))
    },
    injections,
    createAgent,
    services,
  }
}

function waitForTurn() {
  return new Promise((resolve) => setImmediate(resolve))
}

function userMessage(text) {
  return {
    role: 'user',
    source: { kind: 'user' },
    content: [{ type: 'text', text }],
  }
}

test('captures prompts by default', async () => {
  const harness = createHarness()
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_save_prompt')

  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()

  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: userMessage('Please remember this user prompt.'),
  })
  await waitForTurn()

  assert.deepEqual(harness.calls.map((call) => call.name), [
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_save_prompt',
  ])
})

test('prompt and tool-result capture settings remain independent', async () => {
  const promptsDisabled = createHarness({ config: { capturePrompts: false } })
  promptsDisabled.enable(
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_context',
    'mcp__engram__mem_save_prompt',
    'mcp__engram__mem_capture_passive',
  )
  promptsDisabled.emit('agent/session-start', { agent: promptsDisabled.agent })
  await waitForTurn()
  await waitForTurn()
  promptsDisabled.emit('agent/inbox/inserted', {
    agent: promptsDisabled.agent,
    message: userMessage('Please remember this user prompt.'),
  })
  promptsDisabled.emit('tools/result', { agent: promptsDisabled.agent, name: 'shell' }, {
    text: '## Key Learnings:\n- Useful result output.',
  })
  await waitForTurn()
  await waitForTurn()

  assert.deepEqual(promptsDisabled.calls.map((call) => call.name), [
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_context',
    'mcp__engram__mem_capture_passive',
  ])
  assert.equal(promptsDisabled.injections.length, 1)

  const toolResultsDisabled = createHarness({ config: { captureToolResults: false } })
  toolResultsDisabled.enable(
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_save_prompt',
    'mcp__engram__mem_capture_passive',
  )
  toolResultsDisabled.emit('agent/session-start', { agent: toolResultsDisabled.agent })
  await waitForTurn()
  toolResultsDisabled.emit('agent/inbox/inserted', {
    agent: toolResultsDisabled.agent,
    message: userMessage('Please remember this user prompt.'),
  })
  toolResultsDisabled.emit('tools/result', { agent: toolResultsDisabled.agent, name: 'shell' }, {
    text: '## Key Learnings:\n- Useful result output.',
  })
  await waitForTurn()
  await waitForTurn()

  assert.deepEqual(toolResultsDisabled.calls.map((call) => call.name), [
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_save_prompt',
  ])
})

test('recovers bounded context after session start and injects it as a user message', async () => {
  const context = 'x'.repeat(9000)
  const harness = createHarness({
    execute: async (input) => {
      if (input.name.endsWith('mem_context')) return { text: context }
      return { text: 'started' }
    },
  })
  harness.enable(
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_context',
  )

  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()
  await waitForTurn()

  assert.equal(harness.calls.map((call) => call.name).join(','), 'mcp__engram__mem_session_start,mcp__engram__mem_context')
  assert.equal(harness.injections.length, 1)
  const message = harness.injections[0].message
  assert.equal(message.role, 'user')
  assert.equal(message.source.plugin, 'dsh-gentle-engram')
  assert.match(message.content[0].text, /^Relevant persistent Engram context for this session:/)
  assert.ok(message.content[0].text.length < 9000)
})

test('does not request context when session start fails', async () => {
  const harness = createHarness({
    execute: async (input) => input.name.endsWith('mem_session_start') ? undefined : { text: 'unexpected' },
  })
  harness.enable(
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_context',
  )

  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()
  await waitForTurn()

  assert.deepEqual(harness.calls.map((call) => call.name), ['mcp__engram__mem_session_start'])
  assert.equal(harness.injections.length, 0)
})

test('fails closed without a session working directory', async () => {
  const harness = createHarness({ cwd: null })
  harness.enable(
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_context',
    'mcp__engram__mem_save_prompt',
    'mcp__engram__mem_capture_passive',
    'mcp__engram__mem_search',
    'mcp__engram__mem_save',
  )

  harness.emit('agent/session-start', { agent: harness.agent })
  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: userMessage('Please remember this user prompt.'),
  })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, {
    text: '## Key Learnings:\n- Tool output must stay local.',
  })
  const memory = harness.services.get('engramMemory')
  await memory.search(harness.agent, 'project context')
  await memory.save(harness.agent, { content: 'should not be stored' })
  await waitForTurn()
  await waitForTurn()

  assert.deepEqual(harness.calls, [])
  assert.equal(harness.injections.length, 0)
})

test('does not read or write memory after project resolution fails', async () => {
  const harness = createHarness({
    execute: async (input) => input.name.endsWith('mem_session_start')
      ? { isError: true, content: [{ type: 'text', text: 'ambiguous project' }] }
      : { text: 'unexpected memory access' },
  })
  harness.enable(
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_context',
    'mcp__engram__mem_save_prompt',
    'mcp__engram__mem_capture_passive',
    'mcp__engram__mem_search',
    'mcp__engram__mem_save',
  )

  harness.emit('agent/session-start', { agent: harness.agent })
  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: userMessage('Please remember this user prompt.'),
  })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, {
    text: '## Key Learnings:\n- Tool output must stay local.',
  })
  const memory = harness.services.get('engramMemory')
  await memory.search(harness.agent, 'project context')
  await memory.save(harness.agent, { content: 'should not be stored' })
  await waitForTurn()
  await waitForTurn()
  await waitForTurn()

  assert.deepEqual(harness.calls.map((call) => call.name), ['mcp__engram__mem_session_start'])
  assert.equal(harness.injections.length, 0)
})

test('queues the first prompt until session registration completes', async () => {
  let resolveStart
  const start = new Promise((resolve) => {
    resolveStart = resolve
  })
  const harness = createHarness({
    execute: async (input) => input.name.endsWith('mem_session_start') ? start : { text: 'ok' },
  })
  harness.enable(
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_context',
    'mcp__engram__mem_save_prompt',
  )

  harness.emit('agent/session-start', { agent: harness.agent })
  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: userMessage('Please remember this user prompt.'),
  })
  const stopping = harness.emit('agent/turn-stopping', { agent: harness.agent })
  await waitForTurn()

  assert.deepEqual(harness.calls.map((call) => call.name), ['mcp__engram__mem_session_start'])

  resolveStart({ text: 'registered' })
  await stopping

  assert.ok(harness.calls.some((call) => call.name === 'mcp__engram__mem_save_prompt'))
})

test('keeps the memory service available after project registration', async () => {
  const harness = createHarness()
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_search', 'mcp__engram__mem_save')

  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()
  const memory = harness.services.get('engramMemory')
  await memory.search(harness.agent, 'project context')
  await memory.save(harness.agent, { content: 'A verified project learning.' })

  assert.deepEqual(harness.calls.map((call) => call.name), [
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_search',
    'mcp__engram__mem_save',
  ])
})

test('keeps concurrent agent project attribution isolated', async () => {
  const harness = createHarness({
    execute: async (input) => input.name.endsWith('mem_context')
      ? { text: `context for ${input.agent.id}` }
      : { text: 'ok' },
  })
  const otherAgent = harness.createAgent('session-2', '/other-workspace')
  harness.enable(
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_context',
    'mcp__engram__mem_save_prompt',
  )

  harness.emit('agent/session-start', { agent: harness.agent })
  harness.emit('agent/session-start', { agent: otherAgent })
  await waitForTurn()
  await waitForTurn()
  await waitForTurn()
  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: userMessage('Prompt from the first project.'),
  })
  harness.emit('agent/inbox/inserted', {
    agent: otherAgent,
    message: userMessage('Prompt from the second project.'),
  })
  await waitForTurn()
  await waitForTurn()

  assert.deepEqual(
    harness.calls.filter((call) => call.name.endsWith('mem_session_start')).map((call) => [call.agent.id, call.arguments.directory]),
    [['session-1', '/workspace'], ['session-2', '/other-workspace']],
  )
  assert.deepEqual(
    harness.injections.map(({ agent, message }) => [agent.id, message.content[0].text]),
    [
      ['session-1', 'Relevant persistent Engram context for this session:\n\ncontext for session-1'],
      ['session-2', 'Relevant persistent Engram context for this session:\n\ncontext for session-2'],
    ],
  )
  assert.deepEqual(
    harness.calls.filter((call) => call.name.endsWith('mem_save_prompt')).map((call) => [call.agent.id, call.arguments.session_id]),
    [['session-1', 'session-1'], ['session-2', 'session-2']],
  )
})

test('captures prompts only from built-in user messages', async () => {
  const harness = createHarness()
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_save_prompt')
  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()

  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: { ...userMessage('Plugin generated prompt.'), source: { kind: 'plugin', plugin: 'other-plugin' } },
  })
  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: { ...userMessage('System generated prompt.'), role: 'system', source: { kind: 'system-prompt' } },
  })
  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: { ...userMessage('Unknown generated prompt.'), source: { kind: 'automation' } },
  })
  await waitForTurn()

  assert.deepEqual(harness.calls.map((call) => call.name), ['mcp__engram__mem_session_start'])
})

test('captures only intentional non-trivial passive learnings', async () => {
  const harness = createHarness()
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_capture_passive')
  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()

  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, { text: 'Build completed successfully.' })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, {
    isError: true,
    text: '## Key Learnings:\n- A failed result must not be saved.',
  })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, {
    text: '## Key Learnings:\n- \n- ok\n- Done.\n- true\n- 1',
  })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, {
    text: 'Unstructured tool output.\n\n## Key Learnings:\n- Session startup validates the project directory.\n- Search returns matching observations.\n\n## Diagnostics\nRaw output must not be captured.',
  })
  await waitForTurn()
  await waitForTurn()

  const passive = harness.calls.filter((call) => call.name.endsWith('mem_capture_passive'))
  assert.deepEqual(passive.map((call) => call.arguments.content), [
    '## Key Learnings:\n- Session startup validates the project directory.\n- Search returns matching observations.',
  ])
})

test('redacts private blocks recursively in prompt and passive captures', async () => {
  const harness = createHarness()
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_save_prompt', 'mcp__engram__mem_capture_passive')
  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()

  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: {
      role: 'user',
      source: { kind: 'user' },
      content: [{
        type: 'text',
        text: 'Start\n<private>first line\n<private>nested</private>\nlast line</private> middle <private>repeat</private> end <private></private>.',
      }],
      metadata: { note: 'Hidden <private>metadata</private>.' },
    },
  })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, {
    content: [{ type: 'text', text: '## Key Learnings:\n- Keep this <private>tool secret</private> and this.' }],
  })
  await waitForTurn()
  await waitForTurn()

  const prompt = harness.calls.find((call) => call.name.endsWith('mem_save_prompt'))
  const passive = harness.calls.find((call) => call.name.endsWith('mem_capture_passive'))
  assert.equal(prompt.arguments.content, 'Start\n[REDACTED] middle [REDACTED] end [REDACTED].')
  assert.equal(passive.arguments.content, '## Key Learnings:\n- Keep this [REDACTED] and this.')
  assert.doesNotMatch(`${prompt.arguments.content}\n${passive.arguments.content}`, /first line|nested|repeat|tool secret|<private>/)
})

test('redacts private blocks that span multiple content blocks', async () => {
  const harness = createHarness()
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_save_prompt', 'mcp__engram__mem_capture_passive')
  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()

  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: {
      role: 'user',
      source: { kind: 'user' },
      content: [
        { type: 'text', text: 'visible before <private>secret first half' },
        { type: 'text', text: 'secret second half</private> visible after' },
      ],
    },
  })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, {
    content: [
      { type: 'text', text: '## Key Learnings:\n- result before <private>hidden first half' },
      { type: 'text', text: 'hidden second half</private> result after' },
    ],
  })
  await waitForTurn()
  await waitForTurn()

  const prompt = harness.calls.find((call) => call.name.endsWith('mem_save_prompt'))
  const passive = harness.calls.find((call) => call.name.endsWith('mem_capture_passive'))
  assert.equal(prompt.arguments.content, 'visible before [REDACTED] visible after')
  assert.match(passive.arguments.content, /result before \[REDACTED\]/)
  assert.doesNotMatch(
    `${prompt.arguments.content}\n${passive.arguments.content}`,
    /secret first half|secret second half|hidden first half|hidden second half|<\/?private>/,
  )
})

test('does not include tool names in passive learning capture', async () => {
  const harness = createHarness()
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_capture_passive')
  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()

  harness.emit('tools/result', { agent: harness.agent, name: 'shell <private>private name</private> visible' }, {
    text: '## Key Learnings:\n- Public output is retained.',
  })
  await waitForTurn()
  await waitForTurn()

  const passive = harness.calls.find((call) => call.name.endsWith('mem_capture_passive'))
  assert.equal(passive.arguments.content, '## Key Learnings:\n- Public output is retained.')
  assert.doesNotMatch(passive.arguments.content, /private name|<private>|shell/)
})

test('bounds prompt and passive capture payloads to 4000 characters', async () => {
  const harness = createHarness()
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_save_prompt', 'mcp__engram__mem_capture_passive')
  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()

  harness.emit('agent/inbox/inserted', {
    agent: harness.agent,
    message: userMessage('p'.repeat(5000)),
  })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, {
    text: `## Key Learnings:\n- ${'r'.repeat(5000)}`,
  })
  await waitForTurn()
  await waitForTurn()

  const prompt = harness.calls.find((call) => call.name.endsWith('mem_save_prompt'))
  const passive = harness.calls.find((call) => call.name.endsWith('mem_capture_passive'))
  assert.ok(prompt.arguments.content.length <= 4000)
  assert.ok(passive.arguments.content.length <= 4000)
  assert.match(prompt.arguments.content, /\.\.\.\[truncated by dsh-gentle-engram\]$/)
  assert.match(passive.arguments.content, /\.\.\.\[truncated by dsh-gentle-engram\]$/)
})

for (const sensitiveWord of ['password', 'token', 'secret']) {
  test(`does not capture tool output containing ${sensitiveWord}`, async () => {
    const harness = createHarness()
    harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_capture_passive')

    harness.emit('agent/session-start', { agent: harness.agent })
    await waitForTurn()

    harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, {
      text: `## Key Learnings:\n- contains ${sensitiveWord}`,
    })
    await waitForTurn()

    assert.deepEqual(harness.calls.map((call) => call.name), ['mcp__engram__mem_session_start'])
  })
}

test('disposes sessions by awaiting summary before ending the session', async () => {
  const harness = createHarness()
  harness.enable(
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_session_summary',
    'mcp__engram__mem_session_end',
  )

  harness.emit('agent/session-start', { agent: harness.agent })
  await waitForTurn()
  harness.emit('agent/disposed', { agent: harness.agent })
  await waitForTurn()
  await waitForTurn()

  assert.deepEqual(harness.calls.map((call) => call.name), [
    'mcp__engram__mem_session_start',
    'mcp__engram__mem_session_summary',
    'mcp__engram__mem_session_end',
  ])
})

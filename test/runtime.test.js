import assert from 'node:assert/strict'
import test from 'node:test'

import { apply } from '../dist/index.js'

function createHarness({ execute, cwd = '/workspace' } = {}) {
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

  apply(context)

  return {
    agent: createAgent('session-1', cwd),
    createAgent,
    services,
    calls,
    emit(event, ...args) {
      return listeners.get(event)?.(...args)
    },
    enable(...names) {
      names.forEach((name) => availableTools.add(name))
    },
    injections,
  }
}

function waitForTurn() {
  return new Promise((resolve) => setImmediate(resolve))
}

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

for (const sensitiveWord of ['password', 'token', 'secret']) {
  test(`does not capture tool output containing ${sensitiveWord}`, async () => {
    const harness = createHarness()
    harness.enable('mcp__engram__mem_capture_passive')

    harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, { text: `contains ${sensitiveWord}` })
    await waitForTurn()

    assert.equal(harness.calls.length, 0)
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
  harness.emit('agent/inbox/inserted', { agent: harness.agent, message: 'Please remember this user prompt.' })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, { text: 'Tool output stays local.' })
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
  harness.emit('agent/inbox/inserted', { agent: harness.agent, message: 'Please remember this user prompt.' })
  harness.emit('tools/result', { agent: harness.agent, name: 'shell' }, { text: 'Tool output stays local.' })
  const memory = harness.services.get('engramMemory')
  await memory.search(harness.agent, 'project context')
  await memory.save(harness.agent, { content: 'should not be stored' })
  await waitForTurn()
  await waitForTurn()

  assert.deepEqual(harness.calls.map((call) => call.name), ['mcp__engram__mem_session_start'])
  assert.equal(harness.injections.length, 0)
})

test('queues the first prompt until session registration completes', async () => {
  let resolveStart
  const start = new Promise((resolve) => { resolveStart = resolve })
  const harness = createHarness({
    execute: async (input) => input.name.endsWith('mem_session_start') ? start : { text: 'ok' },
  })
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_context', 'mcp__engram__mem_save_prompt')

  harness.emit('agent/session-start', { agent: harness.agent })
  harness.emit('agent/inbox/inserted', { agent: harness.agent, message: 'Please remember this user prompt.' })
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
  harness.enable('mcp__engram__mem_session_start', 'mcp__engram__mem_context', 'mcp__engram__mem_save_prompt')

  harness.emit('agent/session-start', { agent: harness.agent })
  harness.emit('agent/session-start', { agent: otherAgent })
  await waitForTurn()
  await waitForTurn()
  await waitForTurn()
  harness.emit('agent/inbox/inserted', { agent: harness.agent, message: 'Prompt from the first project.' })
  harness.emit('agent/inbox/inserted', { agent: otherAgent, message: 'Prompt from the second project.' })
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

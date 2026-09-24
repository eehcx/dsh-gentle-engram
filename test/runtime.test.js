import assert from 'node:assert/strict'
import test from 'node:test'

import { apply } from '../dist/index.js'

function createHarness({ execute } = {}) {
  const listeners = new Map()
  const calls = []
  const injections = []
  const availableTools = new Set()
  const toolExecute = execute || (async () => ({ text: 'ok' }))

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
    provide() {},
  }

  apply(context)

  return {
    agent: {
      id: 'session-1',
      session: { requestHeader: () => ({ cwd: '/workspace' }) },
      inject(message) {
        injections.push(message)
      },
    },
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
  const message = harness.injections[0]
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

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Config, resolveConfig, type ConfigInput, type EngramConfig } from './config.ts'

const DEFAULTS: EngramConfig = {
  binary: 'engram',
  url: undefined,
  port: 7437,
  ambientMemory: true,
  contextLimit: 8000,
  captureToolResults: true,
  capturePrompts: true,
  requestTimeoutMs: 3000,
  startupTimeoutMs: 10_000,
  fetchMaxAttempts: 3,
}

const raw = (value: Record<string, unknown>): ConfigInput => value as ConfigInput

const ENV_KEYS = ['ENGRAM_URL', 'ENGRAM_BIN', 'ENGRAM_PORT'] as const

function withEnv<T>(values: Partial<Record<(typeof ENV_KEYS)[number], string>>, fn: () => T): T {
  const saved = ENV_KEYS.map(key => [key, process.env[key]] as const)
  for (const key of ENV_KEYS) {
    const value = values[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  try {
    return fn()
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('an out-of-range numeric yml value throws a ValidationError', () => {
  const cases = [
    { port: 0 },
    { port: 65536 },
    { port: 99999 },
    { requestTimeoutMs: 99 },
    { requestTimeoutMs: 120001 },
    { startupTimeoutMs: 499 },
    { startupTimeoutMs: 300001 },
    { fetchMaxAttempts: 0 },
    { fetchMaxAttempts: 9 },
    { contextLimit: 100001 },
  ]
  for (const input of cases) {
    assert.throws(() => Config(raw(input)), { name: 'ValidationError' }, `expected ${JSON.stringify(input)} to be rejected`)
  }
})

test('a wrong-typed numeric yml value throws a ValidationError', () => {
  assert.throws(() => Config(raw({ port: 'abc' })), { name: 'ValidationError' })
})

test('a non-integer numeric yml value throws instead of being truncated', () => {
  assert.throws(() => Config(raw({ port: 1.5 })), { name: 'ValidationError' })
  assert.throws(() => Config(raw({ requestTimeoutMs: 3000.5 })), { name: 'ValidationError' })
})

test('a blank binary throws a ValidationError', () => {
  assert.throws(() => Config(raw({ binary: '' })), { name: 'ValidationError' })
  assert.throws(() => Config(raw({ binary: '   ' })), { name: 'ValidationError' })
})

test('a wrong-typed boolean yml value throws a ValidationError', () => {
  assert.throws(() => Config(raw({ capturePrompts: 'yes' })), { name: 'ValidationError' })
  assert.throws(() => Config(raw({ ambientMemory: 'no' })), { name: 'ValidationError' })
})

test('an unknown config key throws an error naming the key', () => {
  assert.throws(() => resolveConfig(raw({ bogus: 1 })), /bogus/)
})

test('a malformed environment port throws an error naming ENGRAM_PORT', () => {
  assert.throws(() => withEnv({ ENGRAM_PORT: 'abc' }, () => resolveConfig(raw({}))), /ENGRAM_PORT/)
  assert.throws(() => withEnv({ ENGRAM_PORT: '99999' }, () => resolveConfig(raw({}))), /ENGRAM_PORT/)
  assert.throws(() => withEnv({ ENGRAM_PORT: '1.5' }, () => resolveConfig(raw({}))), /ENGRAM_PORT/)
})

test('an absent or empty config resolves to every default', () => {
  withEnv({}, () => {
    assert.deepEqual(resolveConfig(undefined), DEFAULTS)
    assert.deepEqual(resolveConfig({}), DEFAULTS)
  })
})

test('the schema itself fills every default from an empty object', () => {
  withEnv({}, () => {
    assert.deepEqual(Config(raw({})), { ...DEFAULTS, url: '' })
  })
})

test('environment variables override yml values', () => {
  withEnv({ ENGRAM_PORT: '1234' }, () => {
    assert.equal(resolveConfig(raw({ port: 7437 })).port, 1234)
  })
  withEnv({ ENGRAM_BIN: '/usr/local/bin/engram' }, () => {
    assert.equal(resolveConfig(raw({ binary: 'other' })).binary, '/usr/local/bin/engram')
  })
  withEnv({ ENGRAM_URL: 'http://127.0.0.1:9000' }, () => {
    assert.equal(resolveConfig(raw({ url: 'http://example.test' })).url, 'http://127.0.0.1:9000')
  })
})

/**
 * Plugin configuration: the Cordis `Config` schema, defaults, and environment
 * overrides.
 *
 * `Config` is the single source of truth: cordis validates it and applies defaults
 * before `apply` runs, and `resolveConfig` reuses the same constraints for the
 * environment layer.
 *
 * @module dsh-gentle-engram/config
 */

import Schema from '@deepseek-ai/schemastery'

/** Fully resolved plugin configuration. */
export interface EngramConfig {
  /** Engram binary used to spawn `serve` when no external server is configured. */
  readonly binary: string
  /** Externally managed base URL. When set the plugin never spawns or heals a server. */
  readonly url: string | undefined
  /** TCP port for an implicitly owned server. */
  readonly port: number
  /** Inject recent memory context automatically into session at start. */
  readonly ambientMemory: boolean
  /** Maximum bytes for ambient memory context block. */
  readonly contextLimit: number
  /** Capture non-Engram tool results as passive observations. */
  readonly captureToolResults: boolean
  /** Capture human prompts. */
  readonly capturePrompts: boolean
  /** Per-request HTTP timeout. */
  readonly requestTimeoutMs: number
  /** Total budget for one server startup attempt. */
  readonly startupTimeoutMs: number
  /** Attempts for one replay-safe request. */
  readonly fetchMaxAttempts: number
}

const FIELDS = {
  binary: Schema.string().pattern(/\S/).default('engram').description('Engram binary used to query or spawn serve'),
  url: Schema.string().default('').description('Externally managed base URL. When set, uses this server URL'),
  port: Schema.natural().min(1).max(65_535).default(7437).description('TCP port for Engram HTTP server'),
  ambientMemory: Schema.boolean().default(true).description('Inject recent memory context into session prompt'),
  contextLimit: Schema.natural().max(100_000).default(8000).description('Max bytes for ambient memory block'),
  captureToolResults: Schema.boolean().default(true).description('Capture non-Engram tool results as passive observations'),
  capturePrompts: Schema.boolean().default(true).description('Capture human prompts'),
  requestTimeoutMs: Schema.natural().min(100).max(120_000).default(3000).description('Per-request HTTP timeout in ms'),
  startupTimeoutMs: Schema.natural().min(500).max(300_000).default(10_000).description('Total budget for server startup'),
  fetchMaxAttempts: Schema.natural().min(1).max(8).default(3).description('Max attempts for replay-safe request'),
}

/** The plugin config, as cordis consumes it. */
export const Config = Schema.object(FIELDS)

/** Schema input: every field optional, unknown keys tolerated by the schema itself. */
export type ConfigInput = Schemastery.TypeS<typeof Config>

/** Schema output: the validated, default-filled object cordis hands to `apply`. */
export type ConfigOutput = Schemastery.TypeT<typeof Config>

const KNOWN_KEYS = new Set(Object.keys(FIELDS))

/**
 * Reject a config key the schema does not declare.
 */
function assertKnownKeys(raw: ConfigInput | undefined): void {
  if (raw === undefined) return
  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.has(key)) {
      throw new TypeError(`unknown config key "${key}" (expected one of ${[...KNOWN_KEYS].join(', ')})`)
    }
  }
}

/** Env override helper: first non-blank value wins. */
function envString(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value !== undefined && value.length > 0 ? value : undefined
}

/**
 * Read `ENGRAM_PORT`, validated by the same schema as the yml value.
 */
function envPort(): number | undefined {
  const raw = envString('ENGRAM_PORT')
  if (raw === undefined) return undefined
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new TypeError(`invalid ENGRAM_PORT "${raw}": expected a number`)
  try {
    return FIELDS.port(value)
  } catch (error) {
    throw new TypeError(`invalid ENGRAM_PORT "${raw}": ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Bearer token for a token-protected Engram server (`ENGRAM_HTTP_TOKEN`).
 */
export function engramAuthToken(): string | undefined {
  const value = process.env.ENGRAM_HTTP_TOKEN
  return value !== undefined && value.length > 0 ? value : undefined
}

/**
 * Resolve raw plugin config plus environment into a complete configuration.
 */
export function resolveConfig(raw?: ConfigInput): EngramConfig {
  assertKnownKeys(raw)
  const validated = Config(raw ?? {})
  const ymlUrl = validated.url.trim()
  const url = envString('ENGRAM_URL') ?? (ymlUrl === '' ? undefined : ymlUrl)
  return {
    binary: envString('ENGRAM_BIN') ?? validated.binary.trim(),
    url,
    port: envPort() ?? validated.port,
    ambientMemory: validated.ambientMemory,
    contextLimit: validated.contextLimit,
    captureToolResults: validated.captureToolResults,
    capturePrompts: validated.capturePrompts,
    requestTimeoutMs: validated.requestTimeoutMs,
    startupTimeoutMs: validated.startupTimeoutMs,
    fetchMaxAttempts: validated.fetchMaxAttempts,
  }
}

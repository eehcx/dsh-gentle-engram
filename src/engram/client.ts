/**
 * HTTP client for the Engram server.
 *
 * @module dsh-gentle-engram/engram/client
 */

import { setTimeout as sleep } from 'node:timers/promises'
import { engramAuthToken, type EngramConfig } from '../config.ts'
import { losslessJson } from '../json.ts'
import { redactUrlPath, redactValue } from '../redaction.ts'
import {
  EngramHttpError,
  EngramTimeoutError,
  isConnectionRefusedError,
  isTimeoutError,
} from './errors.ts'

export interface Logger {
  warn(message: string): void
  info?(message: string): void
}

export interface FetchOptions {
  readonly method?: string
  readonly body?: unknown
  readonly signal?: AbortSignal
}

export interface EngramFetchResult<T> {
  readonly data: T | null
  readonly timedOutMethod?: string
}

export type EngramHealth = 'ready' | 'refused' | 'indeterminate' | 'foreign'

export interface EngramClient {
  readonly baseUrl: string
  request<T>(path: string, options?: FetchOptions): Promise<T | null>
  requestResult<T>(path: string, options?: FetchOptions): Promise<EngramFetchResult<T>>
  bestEffort<T>(path: string, options?: FetchOptions): Promise<T | null>
  probeHealth(expectedInstanceId: string): Promise<EngramHealth>
}

const HEALTH_TIMEOUT_MS = 500

export function isSafeToReplay(path: string, method: string): boolean {
  return method === 'GET' || (method === 'POST' && path === '/sessions')
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function timeoutMessage(path: string, method: string, timeoutMs: number): string {
  const target = `Engram ${method} ${redactUrlPath(path)} timed out after ${timeoutMs}ms`
  if (method === 'GET') return target
  return `${target}; the request may already have been applied server-side. Do NOT blindly retry it.`
}

export function createClient(config: EngramConfig, logger: Logger): EngramClient {
  const baseUrl = config.url ?? `http://127.0.0.1:${config.port}`

  async function attempt(path: string, options: FetchOptions): Promise<{ response: Response } | { failure: unknown }> {
    const method = options.method ?? 'GET'
    const token = engramAuthToken()
    const timeout = AbortSignal.timeout(config.requestTimeoutMs)
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout])
    try {
      const response = await fetch(`${baseUrl}${redactUrlPath(path)}`, {
        method,
        headers: options.body === undefined && token === undefined ? undefined : {
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(redactValue(options.body)),
        signal,
      })
      return { response }
    } catch (error: unknown) {
      return { failure: error }
    }
  }

  async function decode<T>(response: Response): Promise<T | null> {
    let data: unknown = null
    if (response.status !== 204) {
      try {
        data = await response.json()
      } catch (error: unknown) {
        if (response.ok) throw error
      }
    }
    if (!response.ok) {
      const record = data !== null && typeof data === 'object' ? data as Record<string, unknown> : undefined
      const detail = typeof record?.error === 'string' ? record.error : `Engram request failed with HTTP ${response.status}`
      throw new EngramHttpError(detail, response.status, data)
    }
    return losslessJson(data) as T | null
  }

  async function requestResult<T>(path: string, options: FetchOptions = {}): Promise<EngramFetchResult<T>> {
    const method = options.method ?? 'GET'
    for (let attemptIndex = 0; attemptIndex < config.fetchMaxAttempts; attemptIndex += 1) {
      const outcome = await attempt(path, options)
      if ('response' in outcome) return { data: await decode<T>(outcome.response) }

      const error = outcome.failure
      if (isTimeoutError(error)) return { data: null, timedOutMethod: method }

      if (!isSafeToReplay(path, method) || attemptIndex === config.fetchMaxAttempts - 1) {
        throw error
      }
      await sleep(250 * 2 ** attemptIndex)
    }
    throw new EngramTimeoutError(`Engram request to ${redactUrlPath(path)} exhausted its attempts`)
  }

  return {
    baseUrl,
    async request<T>(path: string, options?: FetchOptions): Promise<T | null> {
      const result = await requestResult<T>(path, options)
      if (result.timedOutMethod !== undefined) {
        throw new EngramTimeoutError(timeoutMessage(path, result.timedOutMethod, config.requestTimeoutMs))
      }
      return result.data
    },
    requestResult,
    async bestEffort<T>(path: string, options?: FetchOptions): Promise<T | null> {
      try {
        return await this.request<T>(path, options)
      } catch (error: unknown) {
        logger.warn(`engram background request to ${redactUrlPath(path)} failed: ${messageOf(error)}`)
        return null
      }
    },
    async probeHealth(expectedInstanceId: string): Promise<EngramHealth> {
      let response: Response
      try {
        response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) })
      } catch (error: unknown) {
        if (isTimeoutError(error)) return 'indeterminate'
        if (isConnectionRefusedError(error)) return 'refused'
        return 'indeterminate'
      }
      if (!response.ok) return 'indeterminate'
      try {
        const health = await response.json() as { instance_id?: unknown } | null
        return health?.instance_id === expectedInstanceId ? 'ready' : 'foreign'
      } catch {
        return 'foreign'
      }
    },
  }
}

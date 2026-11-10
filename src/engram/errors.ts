/**
 * Error shapes for the Engram transport and resolution.
 *
 * @module dsh-gentle-engram/engram/errors
 */

/** A response arrived with a non-2xx status. */
export class EngramHttpError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'EngramHttpError'
    this.status = status
    this.data = data
  }
}

/** A request exceeded its timeout budget. */
export class EngramTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngramTimeoutError'
  }
}

/** Node reports an aborted or expired request through these names. */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
}

/**
 * Check if transport failure indicates connection refused.
 */
export function hasConnectionRefusedCode(value: unknown, depth = 0): boolean {
  if (depth > 4 || value === null || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (record.code === 'ECONNREFUSED') return true
  const errors = record.errors
  if (Array.isArray(errors) && errors.some(entry => hasConnectionRefusedCode(entry, depth + 1))) return true
  return hasConnectionRefusedCode(record.cause, depth + 1)
}

/** Whether a transport failure proves nothing is listening. */
export function isConnectionRefusedError(error: unknown): boolean {
  return (error instanceof Error && error.message === 'connection refused') || hasConnectionRefusedCode(error)
}

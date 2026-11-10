/**
 * Per-session runtime state.
 *
 * @module dsh-gentle-engram/session
 */

import { setTimeout as sleep } from 'node:timers/promises'
import type { Logger } from './engram/client.ts'
import type { ProjectResolution } from './engram/project.ts'

export interface SessionHeaderLike {
  readonly cwd?: string
}

export interface AgentLike {
  readonly id: string
  readonly session?: {
    readonly header?: SessionHeaderLike
    requestHeader?: () => SessionHeaderLike
  }
}

/** Mutable runtime state for one agent session. */
export interface SessionState {
  readonly id: string
  readonly cwd: string
  engramSessionId: string
  project: ProjectResolution | undefined
  projectCheckedAt: number
  pendingNotice: string | undefined
  registered: boolean
  registeredAt: number
  disposed: boolean
  registration: Promise<boolean> | undefined
  startup: Promise<void> | undefined
  tail: Promise<void>
  pending: number
  readonly archivedCompactions: Set<string>
}

export interface SessionRegistry {
  get(id: string | undefined): SessionState | undefined
  ensure(agent: AgentLike): SessionState
  forget(id: string): void
  enqueue<T>(state: SessionState, operation: () => Promise<T>): Promise<T>
  drain(state: SessionState, timeoutMs: number): Promise<void>
}

export const DRAIN_TIMEOUT_MS = 5000

export function extractCwd(agent: AgentLike): string {
  try {
    const fromRequest = agent.session?.requestHeader?.()?.cwd
    if (typeof fromRequest === 'string' && fromRequest.trim()) return fromRequest
  } catch {
    // ignore
  }
  const fromHeader = agent.session?.header?.cwd
  if (typeof fromHeader === 'string' && fromHeader.trim()) return fromHeader
  return ''
}

export function createSessionRegistry(logger: Logger): SessionRegistry {
  const states = new Map<string, SessionState>()

  return {
    get(id: string | undefined): SessionState | undefined {
      return id === undefined ? undefined : states.get(id)
    },
    ensure(agent: AgentLike): SessionState {
      const existing = states.get(agent.id)
      if (existing !== undefined) return existing
      const cwd = extractCwd(agent)
      const state: SessionState = {
        id: agent.id,
        cwd,
        engramSessionId: agent.id,
        project: undefined,
        projectCheckedAt: 0,
        pendingNotice: undefined,
        registered: false,
        registeredAt: 0,
        disposed: false,
        registration: undefined,
        startup: undefined,
        tail: Promise.resolve(),
        pending: 0,
        archivedCompactions: new Set<string>(),
      }
      states.set(agent.id, state)
      return state
    },
    forget(id: string): void {
      if (states.delete(id)) logger.info?.(`engram: released session state for ${id}`)
    },
    enqueue<T>(state: SessionState, operation: () => Promise<T>): Promise<T> {
      state.pending += 1
      const run = state.tail.then(operation)
      const settled = run.then(
        () => { state.pending -= 1 },
        () => { state.pending -= 1 },
      )
      state.tail = settled
      return run
    },
    async drain(state: SessionState, timeoutMs: number): Promise<void> {
      const deadline = Date.now() + timeoutMs
      while (state.pending > 0) {
        const remaining = deadline - Date.now()
        if (remaining <= 0) return
        await Promise.race([state.tail, sleep(remaining, undefined, { ref: false })])
      }
    },
  }
}

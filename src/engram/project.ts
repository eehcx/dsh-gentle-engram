/**
 * Project resolution and the fail-closed write gate.
 *
 * @module dsh-gentle-engram/engram/project
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import type { EngramClient } from './client.ts'
import { EngramHttpError } from './errors.ts'

/** Engram's project resolution envelope. */
export interface ProjectEnvelope {
  readonly project?: unknown
  readonly project_source?: unknown
  readonly project_path?: unknown
  readonly cwd?: unknown
  readonly available_projects?: unknown
  readonly warning?: unknown
  readonly error_hint?: unknown
}

/** Resolution state for one session's workspace. */
export type ProjectResolution =
  | { readonly kind: 'resolved'; readonly project: string; readonly source: string }
  | { readonly kind: 'pending'; readonly reason: string; readonly available: readonly string[] }
  | { readonly kind: 'failed'; readonly reason: string; readonly available: readonly string[] }

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

/** Sources accepted as proof of a real detection. */
const TRUSTED_SOURCES = new Set([
  'config', 'git_remote', 'git_root', 'git_child', 'dir_basename', 'process_override',
])

/**
 * Accept a detected project only when Engram reports no hint of trouble.
 */
export function isSafeDetectedProject(envelope: ProjectEnvelope): string | undefined {
  const candidate = asString(envelope.project)
  if (candidate === undefined) return undefined
  if (candidate.toLowerCase() === 'unknown') return undefined
  if (asString(envelope.error_hint) !== undefined) return undefined
  if (/[\\/\u0000-\u001F\u007F]/.test(candidate)) return undefined
  const source = asString(envelope.project_source)
  if (source !== undefined && !TRUSTED_SOURCES.has(source)) return undefined
  return candidate
}

/**
 * Fallback used when no HTTP server is available or server predates GET /project/current.
 */
export function detectLocalConfigProject(cwd: string): { project: string; path: string } | undefined {
  let current = resolve(cwd || '.')
  for (;;) {
    const configPath = `${current}/.engram/config.json`
    if (existsSync(configPath)) {
      try {
        const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as { project_name?: unknown }
        const project = asString(parsed.project_name)
        if (project !== undefined) return { project, path: configPath }
      } catch {
        return undefined
      }
    }
    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

/**
 * Fallback via CLI hook when no HTTP server is running.
 */
export function detectHookProject(cwd: string, binary = 'engram'): ProjectEnvelope | undefined {
  try {
    const raw = execFileSync(binary, ['hook', 'resolve-hook-project'], {
      input: JSON.stringify({ cwd }),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      timeout: 2000,
    })
    return JSON.parse(raw) as ProjectEnvelope
  } catch {
    return undefined
  }
}

const PROJECT_DETECTION_ATTEMPTS = 5
const PROJECT_DETECTION_RETRY_MS = 200

/** Human-actionable guidance for an unresolvable workspace. */
export function ambiguityGuidance(available: readonly string[]): string {
  const choices = available.length > 0 ? ` Known projects: ${available.join(', ')}.` : ''
  return 'Engram could not determine which project this workspace belongs to. '
    + 'Add .engram/config.json with {"project_name": "..."} at the repository root, '
    + 'or start DeepSeek Harness inside a single repository.'
    + choices
}

/**
 * Resolve the project for one session workspace.
 */
export async function resolveProject(
  client: EngramClient | undefined,
  cwd: string,
  binary = 'engram',
): Promise<ProjectResolution> {
  if (cwd.trim().length === 0) {
    return { kind: 'failed', reason: 'this session did not report a working directory', available: [] }
  }

  // 1. Try HTTP if client is provided
  if (client) {
    const query = `?cwd=${encodeURIComponent(cwd)}`
    for (let attempt = 1; attempt <= PROJECT_DETECTION_ATTEMPTS; attempt += 1) {
      try {
        const envelope = (await client.request<ProjectEnvelope>(`/project/current${query}`)) ?? {}
        const project = isSafeDetectedProject(envelope)
        if (project !== undefined) {
          return { kind: 'resolved', project, source: asString(envelope.project_source) ?? 'unknown' }
        }
        const available = asStringList(envelope.available_projects)
        const hint = asString(envelope.error_hint) ?? asString(envelope.warning)
        if (hint !== undefined || asString(envelope.project) !== undefined) {
          return { kind: 'failed', reason: hint ?? 'Engram reported an unusable project', available }
        }
        return { kind: 'pending', reason: 'Engram did not report a project for this directory', available }
      } catch (error: unknown) {
        if (error instanceof EngramHttpError && error.status === 404) {
          break
        }
        if (attempt === PROJECT_DETECTION_ATTEMPTS) {
          break
        }
        await sleep(PROJECT_DETECTION_RETRY_MS)
      }
    }
  }

  // 2. Try CLI hook inspection
  const hookEnvelope = detectHookProject(cwd, binary)
  if (hookEnvelope) {
    const project = isSafeDetectedProject(hookEnvelope)
    if (project !== undefined) {
      return { kind: 'resolved', project, source: asString(hookEnvelope.project_source) ?? 'hook' }
    }
  }

  // 3. Fallback to local config file search
  const local = detectLocalConfigProject(cwd)
  if (local !== undefined) {
    return { kind: 'resolved', project: local.project, source: 'config' }
  }

  return { kind: 'pending', reason: 'Engram did not report a project for this directory', available: [] }
}

/**
 * Explicit-private-block redaction for everything this plugin sends to Engram.
 *
 * Supports arbitrary nested and sequential <private>...</private> tags.
 *
 * @module dsh-gentle-engram/redaction
 */

const REDACTED = '[REDACTED]'

/** Replace every explicit private block (including nested tags) with a marker. */
export function redactPrivateTags(text: string): string {
  let output = ''
  let visibleFrom = 0
  let depth = 0

  for (const match of text.matchAll(/<\/?private>/gi)) {
    const index = match.index ?? 0
    if (!match[0].startsWith('</')) {
      if (depth === 0) output += `${text.slice(visibleFrom, index)}${REDACTED}`
      depth++
    } else if (depth > 0) {
      depth--
      if (depth === 0) visibleFrom = index + match[0].length
    }
  }

  if (depth === 0) output += text.slice(visibleFrom)
  return output
}

/**
 * Redact a relative URL path, including decoded query values, so a private
 * block cannot leak through a query string.
 */
export function redactUrlPath(path: string): string {
  const redacted = redactPrivateTags(path)
  try {
    const url = new URL(redacted, 'http://engram.local')
    const params = new URLSearchParams()
    for (const [key, value] of url.searchParams.entries()) params.append(key, redactPrivateTags(value))
    const query = params.toString()
    return `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
  } catch {
    return redacted
  }
}

/**
 * Recursively redact strings in an outgoing payload. Object and array shape is
 * preserved; non-string primitives pass through unchanged.
 */
export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') return redactPrivateTags(value)
  if (Array.isArray(value)) return value.map(entry => redactValue(entry))
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) out[key] = redactValue(entry)
    return out
  }
  return value
}

/** Redact and trim captured text before it becomes a payload field. */
export function redactText(value: string): string {
  return redactPrivateTags(value).trim()
}

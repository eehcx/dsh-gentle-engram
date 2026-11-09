# Recalled Engram context policy

## Decision

Keep automatic, bounded Engram context injection enabled by default for session continuity. Treat every recalled observation as untrusted reference data—not an instruction, permission, or source of authority. Keep the Engram memory tools available for on-demand retrieval and verification.

Engram is the trusted storage and retrieval mechanism for this integration. That trust does not make every stored sentence trustworthy: captured prompts and intentional learnings can still be stale, mistaken, or contain instruction-like text.

## Why automatic injection

| Mode | Benefit | Cost |
|---|---|---|
| Automatic bounded context (default) | Restores useful project context without requiring the agent to remember a retrieval step. | Retrieved text enters the model context and may be stale, misleading, or adversarial. |
| On-demand `mem_context` only | The agent chooses when to retrieve more context, reducing unsolicited context. | Continuity is less automatic and depends on the agent recognizing when to ask. |

The wrapper uses automatic injection for a small context window, while `mem_context`, `mem_search`, and related tools remain available for details. This is a usability choice, not a trust upgrade for stored content.

## Trust boundary

- The wrapper frames recalled content between explicit untrusted-memory markers, escapes embedded copies of those markers, and includes the wrapper text in the configured context limit. If the limit cannot fit the framing, automatic injection is skipped.
- The system prompt directs the agent to treat recalled text as reference data only. It must not override current system, developer, or user instructions, authorize tool calls, change safety policy, or replace current repository evidence.
- Verify consequential or conflicting claims against the current repository or the user. Tool authorization must remain independent of what a recalled observation says.
- Framing and prompt policy reduce ambiguity but cannot guarantee that a model will ignore every adversarial instruction. They are not a security boundary for tool permissions.

These controls address context contamination; they do not turn Engram into a sanitizer or certify observations as correct.

## Compaction and surface replacement

- A normal startup or resume continues to hydrate context through the existing session-start flow.
- If DSH emits `agent/session-start` with `source: 'compact'` for the same agent, the wrapper performs one fresh, bounded `mem_context` read and injects it using the same untrusted-data framing. It does not start a second Engram session.
- Do not poll the surface or inspect message text to guess that compaction or replacement occurred. For a surface replacement without an explicit lifecycle signal, do not automatically re-inject; use the on-demand memory tools until the next explicit session lifecycle.
- The exact signal is host-version dependent. Verify it against the tested DSH release before claiming automatic post-compaction recovery for that release.

## References

- [OWASP RAG Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html) recommends treating retrieved content as data, delimiting it, and not trusting it as commands.
- [DSH agent runtime types](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/core/agent/src/runtime-types.ts) define session lifecycle events and their `source` values; compatibility must still be confirmed against the exact DSH build in the compatibility matrix.

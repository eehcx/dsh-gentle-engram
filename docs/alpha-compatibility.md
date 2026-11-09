# Alpha compatibility matrix

This matrix records observed evidence for the current candidate. It is an alpha
integration: a declared peer range is packaging metadata, not proof that a
DSH/Engram combination works end to end. Combinations marked **Unknown** are not
supported claims.

## Status meanings

| Status | Meaning |
|---|---|
| **Verified** | The named check passed on the exact versions and platform shown. |
| **Supported** | The maintainers intend to support the combination and have documented its verification. |
| **Unknown** | The exact combination has not been verified; do not infer compatibility. |

## Evidence

| Node.js | DSH | Engram | OS / architecture | Check and status |
|---|---|---|---|---|
| 22.x (CI) | Not exercised | Not exercised | GitHub Actions Linux runner | Typecheck, build, and runtime tests pass in CI. **Verified for unit/CI checks only; DSH and Engram compatibility Unknown.** |
| 24.18.0 | Mock runtime, no host boot | Mock MCP tool API | Linux / x86_64 | Build, typecheck, and runtime tests pass; the package dry-run includes this document. **Verified for isolated package checks only; live compatibility Unknown.** |
| 24.18.0 | 0.2.2-alpha.2 (isolated CLI profile install; not booted with a live session) | Engram 3.6.2 installed, not executed | Linux / x86_64 | `dsh plugin --profile smoke add <tarball>` accepted the package after the peer-range update, listed it as a profile bundle, and `--dump-config` composed the `engram-mcp` and `engram-memory` rows. The shipped `evaluatePluginCompatibility` gate also accepts the ranges for `0.2.2-alpha.2`, `0.2.2-alpha.3`, `0.2.2-rc.1`, `0.1.5-rc.3`, and `0.1.1-rc.2`. **Verified for install and profile composition; live session Unknown.** |
| 24.18.0 | 0.1.5-rc.3 (CLI installed; not booted with this plugin) | Engram 3.6.2 installed, not executed | Linux / x86_64 | Peer-range arithmetic evaluated with the same shipped gate implementation: accepted for both the 0.1.1-rc.2 and 0.2.2-alpha.2 lines. **Verified for peer-range arithmetic only; live session Unknown.** |
| Any other version | Any | Any | Any | No exact combination evidence recorded. **Unknown.** |

## Integration contract

- The MCP transport requirement is **stdio**, through
  `@deepseek-ai/dsh-mcp-client`; the `engram` executable must be available on
  `PATH`.
- The bundle patches the DSH profile with the Engram MCP client row and this
  session-lifecycle plugin; no second manually added Engram MCP row is needed.
- No live DSH + Engram session is verified yet. In particular, the DSH
  `0.2.2-alpha.2` desktop scenario that motivated the peer-range update has not
  been booted with this plugin and a real Engram data directory.

## Reporting compatibility

- State the package tag/version, Node.js, DSH, Engram, OS, architecture, and MCP
  transport.
- Never attach private prompts, memory contents, database files, tokens, or
  unsanitized logs.

## Remaining evidence

A clean, isolated live smoke test still has to start DSH `0.2.2-alpha.2` with
this plugin and Engram, record memory search/save/context behavior, and check
the agent-disposal summary. Until that is recorded here, the live combination
stays **Unknown**.

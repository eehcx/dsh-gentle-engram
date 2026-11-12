# dsh-gentle-engram

[![npm version](https://img.shields.io/npm/v/dsh-gentle-engram?logo=npm&label=npm)](https://www.npmjs.com/package/dsh-gentle-engram)
[![CI](https://github.com/eehcx/dsh-gentle-engram/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/eehcx/dsh-gentle-engram/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

A [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) Host plugin that connects agent sessions to [Engram](https://github.com/Gentleman-Programming/engram) persistent memory. It restores bounded project context, captures selected prompts and learnings, and summarizes sessions when they end.

> **Early access:** `latest` is the recommended npm installation channel, but this integration is still evolving. Compatibility depends on the installed DSH and Engram versions; see the [compatibility matrix](docs/alpha-compatibility.md). Declared peer-dependency ranges do not establish that a live DSH + Engram combination has been verified.

## Install

Requirements: DSH with the `dsh plugin` command, a configured profile (for example `web`), and the `engram` executable available in `PATH`.

```bash
engram --version
npx @deepseek-ai/dsh plugin --profile web add dsh-gentle-engram@latest
```

Restart DSH after installation. The bundle configures the Engram MCP stdio bridge and the lifecycle plugin together. **Do not add a second Engram MCP row manually.** The `latest` npm dist-tag currently resolves to `0.4.0`.

## What it does

- Starts an Engram memory session for each DSH agent and uses the official Engram MCP tools over stdio.
- Injects bounded, explicitly **untrusted** project memories at session start; refreshes them after compaction when DSH emits the matching lifecycle event.
- Optionally captures user-originated prompts and intentional learnings from successful tool output. These capture controls are independent.
- Serializes memory calls per agent, waits for pending work at turn boundaries, and writes a session summary on disposal.
- Fails closed when a session has no working directory or Engram session startup fails.
- Includes an English/Spanish Engram settings view in DSH. It follows DSH light/dark theme tokens, exposes memory and capture controls, and can show local API health and counts when the optional Engram HTTP API is available. When the API is offline, it displays Engram installation guidance; the MCP bridge does not depend on that HTTP API.

## Settings and capture

The lifecycle plugin configuration is defined in the DSH bundle (`cordis.patch.yml`). Defaults include ambient memory, prompt capture, and passive tool-result capture enabled, with an 8,000-byte context limit. The settings view provides controls for those options and the context limit; its interface is localized in English and Spanish. Preferences are saved locally by the DSH client.

Prompt capture accepts only messages identified as user-originated. Passive capture ignores failed results and generic output; it stores only non-trivial bullets under a `Key Learnings` or `Aprendizajes` heading. Captured text is limited to 4,000 characters. Explicit `<private>...</private>` blocks are replaced with `[REDACTED]` before capture; output containing terms such as `password`, `token`, or `secret` is also skipped for passive capture.

These safeguards are deliberately limited: marker-based redaction and filtering are **not** a complete secret scanner or privacy boundary. Do not send secrets or sensitive data unless they are properly excluded.

## Memory trust and compatibility

Retrieved memories are reference data, not instructions or authority. The plugin frames injected context as untrusted and asks the model to verify consequential or conflicting claims against current instructions and repository evidence. See the [memory context policy](docs/memory-context-policy.md).

The package declares peer ranges for Cordis `^4.0.1 || ~4.0.6-alpha.1` and DSH tools `^0.1.1-rc.2 || ^0.2.2-alpha.2`. These are install metadata, not an end-to-end support guarantee. The [alpha compatibility matrix](docs/alpha-compatibility.md) records what has actually been checked; live DSH + Engram session compatibility remains **unknown** there.

## Troubleshooting

1. Confirm `engram --version` works in the environment where DSH starts.
2. Confirm the plugin is installed in the intended DSH profile, then restart DSH.
3. Remove any manually configured duplicate Engram MCP row and restart.
4. If memory is not loaded or saved, check that the DSH session has a working directory and consult the [compatibility matrix](docs/alpha-compatibility.md).
5. For a reproducible issue, include sanitized versions, platform, profile, and steps. Do not attach prompts, memory contents, tokens, database files, or unsanitized logs. See [Contributing](CONTRIBUTING.md).

## Development

Requires Node.js 22 and pnpm 10.15.0 for the verified repository CI path.

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build
```

CI runs dependency auditing, typechecking, tests, and build on Node.js 22. Tests exercise the built plugin with mock host/tool APIs; passing them does not by itself verify a live DSH + Engram installation.

## Contributing and security

Bug reports, compatibility checks, documentation, and focused improvements are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report suspected vulnerabilities privately using the guidance in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

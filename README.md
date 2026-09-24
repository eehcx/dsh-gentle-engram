# dsh-gentle-engram

Host Cordis plugin written in TypeScript for people using DeepSeek Harness (DSH)
who want [Engram](https://github.com/Gentleman-Programming/engram) persistent
memory to follow the DSH agent lifecycle.

This integration requires [Engram](https://github.com/Gentleman-Programming/engram) to be installed and available on your system; the bridge cannot work without it.

> **Alpha / early access:** This package is being prepared for public alpha
> feedback. Expect incomplete compatibility coverage, breaking changes, and
> behavior that still depends on the DSH and Engram versions installed on your
> machine. It is suitable for evaluation and focused feedback, not a stability
> guarantee.

## Compatibility and requirements

The repository's CI currently runs on **Node.js 22**. The package declares
`@deepseek-ai/cordis` `^4.0.1` and `@deepseek-ai/dsh-tools` `^0.1.1-rc.2`
as peer dependencies. This project does not declare a DSH or Engram version
range, so compatibility with other versions is not promised until verified.

You need:

- Node.js 22 for the verified development and CI path.
- `pnpm` 10.15.0 for repository development (`package.json` declares this
  package manager).
- DeepSeek Harness with the `dsh plugin` command for installation.
- Engram installed as `engram` in `PATH`.
- A configured DSH profile, such as `web`.

## Design

- Uses the existing `@deepseek-ai/dsh-mcp-client` row for official [Engram](https://github.com/Gentleman-Programming/engram) MCP stdio tools.
- Hooks DSH session start, inbound prompts, tool results, turn stopping, and agent disposal.
- Seeds relevant [Engram](https://github.com/Gentleman-Programming/engram) context into the next model step.
- Saves prompts and filtered passive tool learnings asynchronously.
- Serializes per-session writes and waits for pending writes at turn boundaries.
- Closes [Engram](https://github.com/Gentleman-Programming/engram) sessions and records a structured summary when an agent is disposed.
- Never accesses [Engram](https://github.com/Gentleman-Programming/engram) SQLite directly and avoids forwarding likely secrets.

## Installation from npm

Install the alpha channel with:

```bash
npx @deepseek-ai/dsh plugin --profile web add dsh-gentle-engram@alpha
```

Restart DSH after installation. The package is a Host bundle: its `cordis.patch.yml` owns both the MCP bridge and lifecycle plugin. Do not edit shipped presets or add a second manual [Engram](https://github.com/Gentleman-Programming/engram) MCP row.

Check that [Engram](https://github.com/Gentleman-Programming/engram) is available before starting DSH:

```bash
engram --version
```

The command must resolve successfully before DSH starts. If it does not, fix
the Engram installation or `PATH` first; this plugin does not provide Engram.

## What to expect

The plugin connects the existing Engram MCP tools to DSH session start,
prompts, tool results, turn boundaries, and agent disposal. It injects bounded
prior context, serializes per-session writes, filters likely sensitive tool
results, and records a disposal summary. It does not access Engram's SQLite
database directly.

Known limitations:

- This is an alpha integration with no broad DSH/Engram compatibility matrix.
- The bridge depends on the `engram` executable and DSH's MCP/plugin lifecycle;
  missing or incompatible host tooling can prevent startup or persistence.
- Tool-result filtering is heuristic, not a guarantee that secrets or personal
  data are safe to send. Do not use it as a security boundary.
- The package does not promise backward compatibility across DSH, Engram, or
  alpha package releases.

## Troubleshooting

1. Confirm the executable is available: `engram --version`.
2. Confirm the package was added to the intended DSH profile, then restart DSH.
3. If context or writes are missing, check that no manually added Engram MCP
   row conflicts with this package's Host bundle. Remove the duplicate row and
   restart DSH.
4. If the problem persists, reproduce it with the smallest DSH profile and
   report the exact commands, versions, and observed behavior as described in
   [CONTRIBUTING.md](CONTRIBUTING.md).

## Local development

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
pnpm run build
```

CI runs these checks on Node.js 22, along with a high-severity dependency
audit. The test suite exercises the built plugin's lifecycle behavior without
requiring a live DSH or Engram installation.

## Contributing

Contributions, bug reports, documentation updates, compatibility checks, and
focused feature proposals are welcome. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow, checks,
feedback template, and contribution opportunities.

Before starting:

- Check existing [issues](https://github.com/eehcx/dsh-gentle-engram/issues) and
  pull requests to avoid duplicate work.
- Open an issue first for larger changes so the approach can be discussed.
- Do not include secrets, personal Engram data, local database files, or
  machine-specific configuration in commits.

For a typical change:

1. Fork the repository and create a focused branch.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Make the smallest change that solves the problem, preserving existing
   TypeScript and Cordis patterns.
4. Run `pnpm run typecheck`, `pnpm test`, and `pnpm run build`.
5. Open a pull request explaining what changed, why, and how it was validated.

Keep pull requests focused, avoid editing generated `dist/` output directly,
and do not include unrelated formatting or dependency changes. Please report
suspected security vulnerabilities privately rather than in a public issue.

## License

This project is released under the MIT License. See [`LICENSE`](LICENSE) for
the complete license text.

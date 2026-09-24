# Contributing

Thank you for helping improve `dsh-gentle-engram`. This is an alpha / early
access integration, so reproducible feedback and compatibility evidence are
especially valuable. Contributions, bug reports, documentation updates, and
focused feature proposals are welcome.

## Before you start

- Check the existing [issues](https://github.com/eehcx/dsh-gentle-engram/issues)
  and pull requests to avoid duplicate work.
- For larger changes, open an issue first so the approach can be discussed.
- Never include secrets, personal Engram data, local database files, or
  machine-specific configuration in a commit.
- Do not treat the plugin's heuristic filtering as a security boundary. Remove
  sensitive data from logs and issue reports before sharing them.

## Development setup

Requirements:

- Node.js 22, which is the version exercised by CI.
- `pnpm` 10.15.0, as declared by `package.json`.
- DeepSeek Harness and Engram are useful for integration testing, but are not
  required for typechecking and building the package.

Clone the repository and install dependencies:

```bash
git clone https://github.com/eehcx/dsh-gentle-engram.git
cd dsh-gentle-engram
pnpm install --frozen-lockfile
```

The declared peer dependencies are `@deepseek-ai/cordis` `^4.0.1` and
`@deepseek-ai/dsh-tools` `^0.1.1-rc.2`. The repository does not declare a DSH
or Engram version range; compatibility changes should therefore include the
versions used to verify them.

## Making changes

1. Create a focused branch from the default branch:

   ```bash
   git switch -c fix/short-description
   ```

2. Keep changes small and focused. Preserve the existing TypeScript and Cordis
   patterns, and update documentation when behavior or configuration changes.
3. Do not edit generated output in `dist/`; regenerate it with the build script.
4. Avoid unrelated formatting or dependency changes.

## Validation

Run the checks before committing:

```bash
pnpm test
pnpm run typecheck
pnpm run build
git diff --check
```

`pnpm test` builds the package and runs the Node.js built-in test suite against
the built plugin. If your change affects runtime behavior, also test it with a
local DSH profile and Engram when possible. Describe the environment and any
unavailable integration checks in the pull request rather than implying they
were run.

## Feedback and bug reports

Open an issue at the repository's [issue tracker](https://github.com/eehcx/dsh-gentle-engram/issues).
Include:

- The package version and whether it came from the `alpha` or another npm tag.
- `node --version`, `engram --version`, and the DSH version or build identifier.
- Operating system and architecture.
- The DSH profile and relevant non-secret plugin/MCP configuration.
- Exact installation and reproduction steps, including the smallest profile
  that shows the problem.
- Expected behavior, actual behavior, and relevant sanitized logs or errors.

Never include tokens, credentials, personal Engram data, local database files,
or unredacted prompts/tool results. Suspected vulnerabilities must be reported
privately as described below, not in a public issue.

## Ways to contribute

- **Tests:** add characterization coverage for lifecycle ordering, failure paths,
  bounded context, and safe filtering without adding test dependencies.
- **Documentation:** improve the installation path, troubleshooting steps, and
  examples while keeping claims tied to verified behavior.
- **Compatibility:** verify a specific DSH/Engram combination and document the
  exact versions, OS, profile, and result. Do not turn one successful local
  run into a general support claim.
- **Maintenance:** keep generated `dist/` output synchronized through the
  build, preserve the package file list, and keep CI checks reproducible.

## Commits and pull requests

- Use a Conventional Commit message, such as `fix: handle session cleanup`.
- Explain what changed, why it changed, and how it was validated.
- Link related issues where applicable.
- Keep pull requests focused and update the documentation or examples when
  needed.
- Be prepared to respond to review feedback; maintainers may request changes
  before merging.

## Releases

Releases are managed with [Release Please](https://github.com/googleapis/release-please) and published by GitHub Actions.

1. Use [Conventional Commits](https://www.conventionalcommits.org/), such as `fix:` or `feat:`.
2. Push changes to `main`; Release Please opens or updates a release PR.
3. Merge the release PR. It creates a GitHub Release and tag.
4. The publish workflow validates, builds, and publishes that tag to npm.

The npm package must have GitHub Actions configured as a trusted publisher for this repository and the workflow `.github/workflows/publish.yml`. Do not add an npm token to the repository.

## Reporting security issues

Please do not disclose suspected vulnerabilities in a public issue. Contact
the repository maintainers privately through the project's GitHub security
features or a private maintainer channel.

## Code of conduct

Be respectful, constructive, and inclusive. Harassment and discriminatory
behavior are not welcome in this project.

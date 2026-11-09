# Changelog

All notable changes to `dsh-gentle-engram` are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Redacted explicit `<private>...</private>` blocks recursively before sending
  captured prompts and passive tool results to Engram, and bounded each captured
  payload to 4,000 characters.
- Restricted prompt capture to user-originated messages and passive capture to
  intentional learning sections; failed and generic tool results are ignored.
- Framed automatically recovered Engram context as bounded untrusted reference
  data and refresh it after compaction only on an explicit DSH lifecycle signal.
- Expanded the declared Cordis and DSH tools peer ranges to include the DSH
  0.2.2-alpha.2 tooling line, so the DSH plugin compatibility gate accepts the
  package on both alpha lines.

### Added

- Added repository guidance for security reports, issue submissions, pull
  requests, and code ownership.
- Added an alpha compatibility matrix that separates verified package checks
  from unknown DSH/Engram combinations, linked from the README and the bug
  report template.
- Added an independent `capturePrompts` setting so prompt capture can be
  disabled without affecting session startup or tool-result capture.

### Fixed

- Fail closed on missing session directories or unsuccessful project registration
  before reading or writing Engram memory.

## [0.1.1]

### Added

- Added the Host Cordis integration for connecting DSH agent lifecycle events
  to Engram MCP tools.
- Added bounded context injection, per-session write serialization, passive
  tool-result filtering, and disposal summaries.
- Added the alpha installation and development workflow documented in the
  repository.

[Unreleased]: https://github.com/eehcx/dsh-gentle-engram/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/eehcx/dsh-gentle-engram/releases/tag/v0.1.1

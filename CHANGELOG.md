# Changelog

All notable changes to `dsh-gentle-engram` are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and uses [Semantic Versioning](https://semver.org/).

## [0.4.0](https://github.com/eehcx/dsh-gentle-engram/compare/v0.3.3...v0.4.0) (2026-11-11)


### Features

* **ui:** match Engram settings to DSH themes ([6e08c57](https://github.com/eehcx/dsh-gentle-engram/commit/6e08c5734e470027c50026e0fff1e0ffb6e2f9c7))
* **ui:** match Engram settings to DSH themes ([df7b74b](https://github.com/eehcx/dsh-gentle-engram/commit/df7b74bc404cbd8ea12b1bde524ebd0ec023b1fe))

## [0.3.3](https://github.com/eehcx/dsh-gentle-engram/compare/v0.3.2...v0.3.3) (2026-11-11)


### Bug Fixes

* use host React runtime for settings UI ([be59eea](https://github.com/eehcx/dsh-gentle-engram/commit/be59eead8530940569d4357c5274b74bd122eb1b))
* use host React runtime for settings UI ([db1f53c](https://github.com/eehcx/dsh-gentle-engram/commit/db1f53cce837d2a104dc27c1b8fcf81e8dd6011f))

## [0.3.2](https://github.com/eehcx/dsh-gentle-engram/compare/v0.3.1...v0.3.2) (2026-11-11)


### Bug Fixes

* repair plugin config and browser settings UI ([fb67f88](https://github.com/eehcx/dsh-gentle-engram/commit/fb67f886f88c8081891c162db91f5d3d0b628bfe))
* repair plugin config and browser settings UI ([a956f8a](https://github.com/eehcx/dsh-gentle-engram/commit/a956f8a64ea81fb82e15d9371fd58348ce081919))

## [0.3.1](https://github.com/eehcx/dsh-gentle-engram/compare/v0.3.0...v0.3.1) (2026-11-11)


### Bug Fixes

* declare peer dependencies as optional in package metadata ([b5ba8c2](https://github.com/eehcx/dsh-gentle-engram/commit/b5ba8c28142a328d34f69d515cc55780903a2938))
* declare peer dependencies as optional in package metadata ([33be5f5](https://github.com/eehcx/dsh-gentle-engram/commit/33be5f5002efe299e06ed19f9399c52ea4536491))

## [0.3.0](https://github.com/eehcx/dsh-gentle-engram/compare/v0.2.0...v0.3.0) (2026-11-10)


### Features

* adopt hybrid architecture with quality modules from fork ([abfee0a](https://github.com/eehcx/dsh-gentle-engram/commit/abfee0a695329a788daebfacad55e52e20893528))
* adopt hybrid architecture with quality modules from fork ([b64efc3](https://github.com/eehcx/dsh-gentle-engram/commit/b64efc302c91ecb7fea9587e73db9a76c1eb7cfa))
* **ui:** add visual Engram Settings section and client plugin bundle ([748a867](https://github.com/eehcx/dsh-gentle-engram/commit/748a867a9c94fdd4a21095e8a3e32357629507db))
* **ui:** add visual Engram Settings section and client plugin bundle ([d22878a](https://github.com/eehcx/dsh-gentle-engram/commit/d22878a515983206b481d10802911bb80c4b8b1c))

## [0.2.0](https://github.com/eehcx/dsh-gentle-engram/compare/v0.1.1...v0.2.0) (2026-11-09)


### Features

* **config:** make prompt capture independently configurable ([d2d4812](https://github.com/eehcx/dsh-gentle-engram/commit/d2d48122a413ebb4517a3743ac79f1a502a242ff)), closes [#13](https://github.com/eehcx/dsh-gentle-engram/issues/13)
* resolve issues [#10](https://github.com/eehcx/dsh-gentle-engram/issues/10)–[#16](https://github.com/eehcx/dsh-gentle-engram/issues/16) (tracker) ([d9402e4](https://github.com/eehcx/dsh-gentle-engram/commit/d9402e45528b3a967f44e3ef040f6099fc410eb6))


### Bug Fixes

* **capture:** capture only user prompts and intentional learnings ([5a37e9d](https://github.com/eehcx/dsh-gentle-engram/commit/5a37e9db2b2a8ab6f24c20e549ad47bc4bcff856)), closes [#12](https://github.com/eehcx/dsh-gentle-engram/issues/12)
* **compat:** accept the DSH 0.2.2-alpha.2 tooling line ([823d2b4](https://github.com/eehcx/dsh-gentle-engram/commit/823d2b437d4ef9e1dd83bd28f71dfd3dfd996d5b))
* **compat:** accept the DSH 0.2.2-alpha.2 tooling line ([bc70e24](https://github.com/eehcx/dsh-gentle-engram/commit/bc70e242f8a4ef319459f4b0219094d4762d77af))
* **security:** redact private blocks and bound capture payloads ([ac476ba](https://github.com/eehcx/dsh-gentle-engram/commit/ac476baac5342c8cc553f4bccf46fae11761e04a))
* **security:** redact private blocks and bound capture payloads ([e71f4ca](https://github.com/eehcx/dsh-gentle-engram/commit/e71f4cae7dd652029f1d4213e406d5f1150c231f)), closes [#11](https://github.com/eehcx/dsh-gentle-engram/issues/11)
* **security:** treat recalled memory as untrusted reference data ([352fe28](https://github.com/eehcx/dsh-gentle-engram/commit/352fe28c46e06b8dcc6eeae2e0dbacca6b2e2d98)), closes [#14](https://github.com/eehcx/dsh-gentle-engram/issues/14)
* **session:** fail closed on project attribution ([d8e74ba](https://github.com/eehcx/dsh-gentle-engram/commit/d8e74bab88a95553298f5e33527679f8bbb3fdc9))

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

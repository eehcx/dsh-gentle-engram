# ADR-0001: Keep MCP stdio as the default Engram transport

- **Status:** Proposed (spike complete; no transport behavior changed)
- **Date:** 2026-11-08
- **Scope:** Evaluate an opt-in HTTP-native Engram integration without changing the existing package default.

## Decision

Keep `dsh-gentle-engram` on Engram's MCP stdio interface. Do not configure DSH's MCP client to connect to `engram serve`: DSH's `streamable-http` option is an MCP transport, while Engram's `engram serve` exposes a separate REST API. They are not interchangeable protocols.

If a direct REST adapter is implemented later, ship it first as a separately named alpha package, `dsh-gentle-engram-http`, backed by shared capture/session logic where practical. It must be explicitly installed and configured; it must not silently replace, dual-write with, or fall back from the MCP package. Do not have the plugin launch or own the HTTP server in the first implementation.

## Context

The current bundle installs `@deepseek-ai/dsh-mcp-client` with `transport: stdio`, `command: engram`, and `args: ['mcp', '--tools=agent']`. The lifecycle plugin calls the resulting namespaced MCP tools. DSH's official MCP client also supports `streamable-http`, but that still requires an MCP server endpoint. Engram documents `engram mcp` as stdio and `engram serve` as a local JSON/REST API, so switching the DSH field to `streamable-http` would not make the REST API an MCP server.

MCP currently gives this plugin Engram's existing agent tool schemas and error envelopes, with the DSH MCP client owning protocol negotiation, cancellation, reconnection, and tool registration. A direct REST adapter would instead own endpoint configuration, route-to-feature mapping, JSON/error translation, request cancellation, retries, and session binding. It could connect to an already-running service, but creates a second integration surface and depends on a separately managed server.

| Concern | MCP stdio (current) | Direct Engram REST (possible opt-in) |
|---|---|---|
| Interface | Existing Engram agent tools through MCP | Engram local HTTP endpoints; not MCP Streamable HTTP |
| Startup | DSH MCP client starts/manages the local `engram mcp` process | An external operator starts `engram serve`; plugin does not own it |
| Project/session scope | Existing MCP project/session tool contract | Client must explicitly bind every session and request to the DSH session directory and project |
| Failure handling | MCP client owns protocol lifecycle and reconnect behavior | Plugin must define endpoint identity, timeouts, cancellation, and uncertain writes |
| Security boundary | Local stdio process and existing MCP tool policy | Trusted local service only at first; loopback is not authentication or project isolation |

## Required contract before a REST implementation

### Project and session binding

- Capture the DSH agent's session working directory at session start and pass that exact directory to Engram session registration. Do not let an omitted or blank directory resolve against the HTTP server's process working directory.
- Resolve or validate the project against the DSH session directory. Do not treat a process-scoped `/project/current` response as proof of the agent's project. If the HTTP contract cannot establish the requested project from that directory, fail closed before context reads or writes.
- Keep session state isolated per DSH agent. Register one stable session identity with its validated project and directory; never re-register it under another project as a transport fallback.

### Endpoint identity and authentication

- Require an explicit endpoint setting; do not discover a listener or silently fall back to localhost, stdio, or another transport.
- Before memory operations, require a healthy Engram response with a non-empty `instance_id` matching an explicitly configured expected instance identity. Recheck on reconnect. Health and instance identity prevent accidental misrouting; they are not authentication.
- The first REST implementation is limited to a trusted local Engram service. Do not claim that loopback TCP authenticates callers or isolates projects. Engram documents `ENGRAM_HTTP_TOKEN` as selective instance-level protection, not project authorization, and notes that observation PATCH is not covered by that wrapper. A token therefore must not be presented as a complete security boundary.
- Never store credentials in the package, patch, logs, or error text. If a later supported endpoint requires credentials, source them from an explicit secret-bearing runtime configuration and do not forward them across redirects. Remote or mutually untrusted HTTP services remain unsupported until route-wide authentication and authorization are verified.

### Timeouts and writes with unknown outcomes

- Bound health checks and each request with cancellation on timeout or plugin disposal.
- Retry only operations whose idempotency contract is explicit. For observation creation, preserve the same request and stable `operation_id` when recovering an uncertain acknowledgement; never retry it as a new logical write. For every other write without an equivalent idempotency guarantee, report the result as unknown and do not issue a blind retry.
- Do not silently treat a timeout, disconnect, or malformed response as success. Preserve the error distinction between rejected, confirmed, and unknown outcomes.

### Session lease and disposal

- Use an explicit, stable session ID and project/directory binding. Engram's HTTP session registration defaults `ownership_mode` to `shared`; the adapter must deliberately choose and validate the ownership mode rather than relying on that default.
- Treat Engram's runtime lease as stale-process/liveness evidence only; it is not project authorization and does not replace explicit disposal.
- On DSH agent disposal, stop accepting new work, drain queued operations, write the final summary, and end the session. Do not stop the externally managed Engram server. If shutdown interrupts a write, preserve its unknown outcome instead of replaying it blindly.

## Migration

1. Existing users remain on `dsh-gentle-engram` and MCP stdio with no configuration change.
2. An HTTP alpha, if implemented, is installed separately as `dsh-gentle-engram-http` and requires an explicit endpoint plus expected instance identity. It has no automatic migration or fallback path.
3. Promote HTTP only after the compatibility matrix covers session-directory project resolution, two-agent isolation, endpoint mismatch, authentication boundaries, timeout/unknown-write behavior, and disposal. Keep both paths opt-in until that evidence exists.

## Consequences

- The current MCP integration remains the supported default and this spike introduces no runtime, dependency, or configuration changes.
- A REST adapter could connect to a service that outlives a DSH process, but requires explicit operations and security contracts that MCP currently supplies through existing tools and its client lifecycle.
- The separate alpha package avoids changing existing installs, at the cost of an additional package and release surface if the experiment proceeds.

## References

- [DSH MCP client configuration and transports](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)
- [Engram interfaces](https://github.com/Gentleman-Programming/engram/blob/main/docs/codebase/interfaces.md)
- [Engram HTTP API, trust policy, health, and session registration](https://github.com/Gentleman-Programming/engram/blob/main/DOCS.md)

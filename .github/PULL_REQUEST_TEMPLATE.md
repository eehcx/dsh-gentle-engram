## Summary

- What changed and why?
- What is intentionally out of scope?

## Related issue

<!-- Link an issue when applicable, for example: Closes #123. -->

## Validation

<!-- List the exact commands and results. Mention unavailable checks honestly. -->

- [ ] `pnpm run typecheck`
- [ ] `pnpm test`
- [ ] `pnpm run build`
- [ ] `git diff --check`

## Compatibility

- DSH version/build or compatibility impact:
- Engram version/build or compatibility impact:
- Node.js version and operating system used for validation:

## Checklist

- [ ] The change is focused and documented where needed.
- [ ] No secrets, tokens, personal Engram data, local database files, or
      unsanitized logs are included.
- [ ] Generated `dist/` output is synchronized with source, or this change
      does not affect it.
- [ ] `package.json.files` and the npm package contents remain intentional.
- [ ] Security-sensitive behavior was considered and suspected vulnerabilities
      will be reported privately.

# Security Policy

`dsh-gentle-engram` is an alpha integration. Please report suspected security
issues privately so they can be reviewed without exposing users or maintainers.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting feature for this repository when
it is available. If it is not available, contact the maintainer privately
through GitHub at [@eehcx](https://github.com/eehcx) and include `Security`
in the subject. Do not open a public issue for a suspected vulnerability.

Please include only the information needed to reproduce the issue safely:

- the affected package version or commit;
- the DSH, Engram, Node.js, operating system, and architecture versions;
- a minimal reproduction that does not contain real secrets or personal data;
- the observed and expected behavior; and
- sanitized logs or error messages.

Do not publish credentials, tokens, prompts, personal Engram data, local
database files, or other sensitive information. Do not include secrets in a
public issue, pull request, commit, or reproduction.

There is no guaranteed response or remediation timeline. We will assess
reports according to maintainer availability and the severity and
reproducibility of the issue.

## Scope and limitations

The plugin's tool-result filtering is heuristic and is not a security boundary.
Remove sensitive content before it reaches logs, issue reports, or other
shared artifacts.

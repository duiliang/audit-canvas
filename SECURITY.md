# Security Policy

## Supported Versions

AuditCanvas is pre-1.0. Security fixes target the `main` branch until stable releases are established.

## Reporting

Do not open public issues for vulnerabilities involving credential exposure, remote provider handling, or report data leakage.

Report privately to the maintainer contact configured by the repository owner.

## Security Model

- Remote providers are disabled by default.
- API keys must come from environment variables or a secure store.
- Secrets must be redacted from diagnostics and exports.
- Audit scans must not modify source files.


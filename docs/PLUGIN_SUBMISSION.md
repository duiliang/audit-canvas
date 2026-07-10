# Codex Plugin Submission Notes

AuditCanvas has not been submitted to an official Plugin Directory.

## Introduction

`codex-audit-canvas` lets Codex users run local AuditCanvas artifact audits, compare Git baselines, and process accepted findings without hiding full evidence in chat summaries.

## Privacy

- Data stays local by default.
- The plugin invokes local scripts and CLI commands.
- Remote AI providers are disabled by default.
- API keys are read from environment variables only when a user explicitly enables a provider.

## Permissions

- Reads repository files selected for audit.
- Writes `.auditcanvas/` run, report, review, and cache folders.
- Does not modify source files during scanning.
- `resolve-findings` must only operate on accepted findings and must show impact before patches.

## Positive Tests

1. Audit a repository and return a run ID.
2. Audit a single Markdown file and preserve all duplicate evidence.
3. Compare `main` with `HEAD`.
4. Generate accepted finding impact report.
5. Open or reference the local Review Canvas report path.

## Negative Tests

1. Pending findings are not modified by `resolve-findings`.
2. Rejected findings are not modified by `resolve-findings`.
3. Missing CLI build triggers a deterministic build or fails with a clear error.

## Starter Prompts

- Audit this repository with AuditCanvas.
- Compare this branch with main.
- Resolve accepted audit findings.

## Release Checklist

- `pnpm validate:plugin`
- `pnpm validate:marketplace`
- Confirm no official directory status is claimed.
- Confirm plugin scripts call deterministic CLI behavior.
- Confirm plugin skills have trigger and non-trigger conditions.


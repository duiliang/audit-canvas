# ADR 0006: CLI Writes a Local `.auditcanvas` Workspace

Date: 2026-07-10

## Status

Accepted

## Context

The product must be useful without Web hosting, Codex, or AI providers. CLI runs need durable local artifacts that can be reviewed, exported, or optionally committed.

## Decision

The CLI writes scan results to `.auditcanvas/` with `config.json`, `runs/`, `reports/`, `reviews/`, and `cache/`. The cache directory is ignored by Git. Scan writes a run JSON plus JSON, Markdown, and HTML reports. Export and verify-coverage read the latest run by default.

The CLI records Git metadata when available, but can still run outside Git with `WORKTREE` metadata.

## Consequences

- Users can inspect and archive runs without starting the Web app.
- Codex plugin scripts can call deterministic CLI commands instead of reimplementing scan logic.
- Future persistence policy can decide whether runs and reviews should be committed.


# Architecture

## Summary

AuditCanvas is a TypeScript pnpm monorepo with shared schema, deterministic audit core, parsers, Git utilities, optional providers, CLI, Web Review Canvas, and Codex plugin packaging.

## Workspace Layout

```text
apps/
  web/                    React + Vite Review Canvas
packages/
  schema/                 Versioned JSON Schema and TypeScript types
  core/                   Deterministic audit engine and invariants
  git/                    Git metadata and baseline helpers
  parsers/                Markdown, TXT, JSON, and source text parsers
  providers/              Optional AI provider interface and adapters
  cli/                    audit-canvas executable
  ui/                     Shared React UI primitives
plugins/
  codex-audit-canvas/     Codex plugin manifest, skills, scripts, assets
examples/                 Example input projects and generated reports
docs/                     Product, architecture, decisions, release docs
.agents/plugins/          Repo marketplace metadata
```

## Runtime Surfaces

- CLI: Node executable that scans files, writes `.auditcanvas/`, verifies coverage, exports reports, and starts the local server.
- Web: React/Vite app that loads example data for GitHub Pages and local run data when served by the CLI.
- Core packages: deterministic, side-effect-limited functions for parsing, finding generation, coverage, ID generation, export, and validation.
- Providers: optional adapters behind a stable interface. Remote providers are never called unless enabled in config.
- Codex Plugin: ships a standalone CLI bundle inside the plugin archive, executes it in the user's active workspace, and returns run IDs, paths, and review canvas URLs instead of replacing audit reports with chat summaries.

## Data Flow

1. File discovery filters supported text artifacts.
2. Parser creates Artifact records and SourceBlock records with stable content hashes and line ranges.
3. Git helper records repository path, branch, current commit, baseline commit, and file hash.
4. Deterministic rules produce Findings with full evidence references.
5. Provider adapter optionally adds candidate model findings. Invalid provider output is recorded separately and does not contaminate valid findings.
6. Coverage verifier checks source block accounting.
7. Exporters write JSON, Markdown, and standalone HTML without hiding duplicate evidence.
8. Web Review Canvas reads runs, findings, and persisted review decisions from local storage or `.auditcanvas/reviews/`.

## Stable IDs

Stable IDs are generated from schema version, repository identity, normalized source path, line range, content hash, rule ID, and evidence block IDs. Re-running the same input must produce the same SourceBlock IDs and Finding IDs.

## Persistence

CLI writes:

```text
.auditcanvas/
  config.json
  runs/
  reports/
  reviews/
  cache/
```

`.auditcanvas/cache/` is ignored by Git by default. Whether runs, reports, and reviews are committed is user-configurable.

## Security Boundaries

- No source files are modified during scan or export.
- Secrets are redacted before logs, reports, and provider diagnostics are serialized.
- Remote providers require explicit configuration.
- Plugin scripts call deterministic local commands and avoid letting the model infer output formats.
- Plugin scripts never derive the audited workspace from the plugin installation path. They use the launch working directory or the explicit `AUDIT_CANVAS_WORKSPACE` override.

## Web UI Regions

- Artifact Navigator: file tree, Git baseline, runs, filters, finding counts, coverage.
- Source Viewer: full text, line numbers, SourceBlock boundaries, evidence highlight, commit and file hash.
- Finding Panel: category, severity, confidence, full evidence, status actions, filters, reviewer comment.
- Evidence Compare: all duplicate or conflicting occurrences, character diff, semantic diff placeholder, Git diff, model explanation, human conclusion.

# Product Contract

## Product Identity

AuditCanvas is a local-first, Git-aware, AI-assisted software artifact audit workbench. It is an independent open-source project with an optional Codex plugin.

The product must run without Codex and without any AI provider. Web and CLI are first-class product surfaces. The Codex plugin is an adapter and distribution entry point.

## Supported Initial Artifacts

- Markdown files.
- Plain text files.
- JSON files.
- Source files treated as text blocks.
- Git commit, branch, and baseline metadata for scanned files.

Future adapters may add DOCX, PDF, GitHub Issues, pull requests, and external document stores.

## Non-Negotiable Audit Invariants

1. Duplicate content must never be hidden because it is similar.
2. Evidence must not be replaced by an ellipsis marker.
3. Duplicate groups must not display only the first occurrence.
4. Every occurrence must retain complete text, path, heading, line range, and hash metadata.
5. Duplicate groups are expanded by default.
6. Every SourceBlock is counted in coverage statistics.
7. A completed audit must satisfy `sourceBlockCount = coveredBlockCount + excludedBlockCount`.
8. Excluded SourceBlocks must include a reason.
9. Model conclusions and original evidence are stored separately.
10. Findings without evidence locations are invalid.
11. Audit runs do not modify source files.
12. Patches are generated only after a user accepts a Finding.
13. Original text and model summaries are visually distinct.
14. Audit runs record Git commit SHA and file hash.
15. Invalid or incomplete provider output is marked invalid and never silently accepted.

## Data Retention and Privacy

- Data remains local by default.
- Remote AI providers are disabled by default.
- API keys are read only from environment variables or a future secure system store.
- Secrets must not be logged, exported, committed, rendered in the browser state, or written to examples.

## Initial User Workflows

- `audit-canvas scan .` creates a local audit run.
- `audit-canvas verify-coverage` verifies invariants for the latest or selected run.
- `audit-canvas export --format json|markdown|html` writes evidence-preserving reports.
- `audit-canvas serve` opens the Review Canvas against local run data.
- Web users review, accept, reject, resolve, or annotate findings without editing original source files.
- Codex users invoke focused plugin skills that run the same deterministic scripts.

## Definition of Done for v0.1.0

- JSON Schema covers Artifact, SourceBlock, Finding, and AuditRun.
- Deterministic local scan supports parsing, exact duplicates, normalized duplicates, basic near duplicates, coverage checks, Git metadata, file hashes, and exports.
- CLI commands are executable from the workspace.
- Web Review Canvas presents a four-region workbench with full evidence.
- Provider interface includes mock, OpenAI-compatible, and Ollama-compatible adapters, all opt-in.
- Codex plugin contains three focused skills and deterministic scripts.
- CI runs lint, typecheck, tests, build, e2e, manifest validation, and marketplace validation.


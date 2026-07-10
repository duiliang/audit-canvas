# Roadmap

## Phase 0: Research and Product Contract

Status: complete locally.

- Prior art reviewed and documented.
- Product contract written.
- Architecture written.
- Acceptance tests defined.
- Initial ADRs recorded.

## Phase 1: Schema and Deterministic Core

Status: complete locally.

- Add versioned JSON Schema.
- Add TypeScript types.
- Add parsers for Markdown, TXT, JSON, and generic source text.
- Add deterministic duplicate, normalized duplicate, and near duplicate rules.
- Add coverage verification.
- Add JSON, Markdown, and HTML export.
- Add tests for invariants and evidence preservation.

## Phase 2: CLI

Status: complete locally.

- Add `scan`, `serve`, `export`, `verify-coverage`, and `doctor`.
- Write `.auditcanvas/` layout.
- Add CLI integration tests.

## Phase 3: Web Review Canvas

Status: complete locally.

- Build dense four-region Review Canvas.
- Add local review persistence.
- Add filters, trace matrix, Git diff, and export actions.
- Add component and Playwright tests.

## Phase 4: Provider Interface

Status: complete locally.

- Add mock provider.
- Add OpenAI-compatible provider.
- Add Ollama provider.
- Add invalid output isolation and secret redaction tests.

## Phase 5: Codex Plugin

Status: complete locally.

- Add plugin manifest.
- Add audit-artifacts, compare-baselines, and resolve-findings skills.
- Add deterministic scripts.
- Add repo marketplace metadata.
- Validate plugin manifest and marketplace.

## Phase 6: Open Source Release Preparation

Status: next.

- Add community docs.
- Add CI, Dependabot, Pages demo, examples, screenshots, notices, and release notes.
- Run release gate locally.
- Publish only if GitHub authentication and repository permissions are available.

## v0.2 Candidate Issues

- Optional Doorstop import adapter.
- Optional OpenFastTrace report import adapter.
- PDF and DOCX parser adapters.
- GitHub Issue and Pull Request adapters.
- Semantic contradiction provider prompt packs.
- Multi-run trend dashboard.

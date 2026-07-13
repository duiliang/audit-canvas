# Build State

Last updated: 2026-07-13

## Current Phase

Product correction after `v0.1.0`: the active priority is the real Review Canvas vertical slice. Release infrastructure remains available, but publication status is not treated as evidence that the product workflow is complete. See `docs/EXECUTION_GUARDRAILS.md`.

## Completed

- Created local project directory.
- Initialized Git repository.
- Reviewed prior art sources and licenses.
- Wrote product contract, architecture, acceptance tests, roadmap, build state, and ADRs.
- Added TypeScript pnpm workspace configuration.
- Added `@audit-canvas/schema` with JSON Schema, TypeScript types, and Ajv validation.
- Added `@audit-canvas/core` with stable IDs, Markdown/TXT/JSON/source parsing, exact duplicate detection, normalized duplicate detection, basic near duplicate detection, coverage invariant checks, and JSON/Markdown/HTML exports.
- Added unit tests for parser stability, duplicate evidence preservation, near duplicates without a model, schema validation, and no ellipsis evidence substitution.
- Added `@audit-canvas/git` for Git repository, branch, and commit metadata.
- Added `@audit-canvas/cli` executable with `scan`, `export`, `verify-coverage`, `doctor`, and `serve`.
- Added CLI integration test that writes `.auditcanvas/`, exports HTML, verifies coverage, and checks duplicate evidence is not replaced by ellipses.
- Added `@audit-canvas/ui` shared React UI primitives.
- Added `apps/web` Review Canvas with Artifact Navigator, Source Viewer, Finding Panel, Evidence Compare, Trace Matrix, Git Diff, Finding List, localStorage-backed review state, export controls, dark mode, English/Chinese toggle, and keyboard finding navigation.
- Added Web component test verifying the four-region workbench renders all three duplicate evidence occurrences and does not render `...`.
- Added `@audit-canvas/providers` with Provider interface, Mock provider, OpenAI-compatible adapter, Ollama adapter, provider finding validation, invalid provider diagnostics, and secret redaction.
- Added provider tests for valid mock findings, invalid JSON isolation, missing evidence rejection, secret redaction, and disabled provider behavior.
- Added `plugins/codex-audit-canvas/.codex-plugin/plugin.json`.
- Added `audit-artifacts`, `compare-baselines`, and `resolve-findings` skills with trigger and non-trigger guidance.
- Added deterministic plugin scripts for audit, baseline comparison, and accepted finding impact review.
- Bundled the CLI into the plugin and added standalone-install tests proving all three plugin workflows operate on the user's active workspace.
- Added `.agents/plugins/marketplace.json`.
- Added `scripts/validate-plugin.mjs` and `scripts/validate-marketplace.mjs`.
- Added English and Chinese README files, MIT license, contributing guide, code of conduct, security policy, privacy policy, changelog, notices, issue templates, pull request template, Dependabot, CI workflow, Pages workflow, plugin submission notes, sample project, sample reports, architecture diagram, and real UI screenshot.
- Added Playwright E2E test for the Review Canvas.
- Added desktop and mobile Playwright coverage for the default Chinese experience and persisted English fallback.
- Added a real temporary Git workspace E2E path covering scan, serve, full evidence, persisted review state, reviewed export, and accepted-finding impact.
- Added Chinese-default Markdown/HTML exports while keeping JSON, evidence, paths, IDs, and schema enums unchanged.
- Added enforced coverage thresholds: 75% statements/lines, 70% branches, and 60% functions.
- Added release metadata validation and current GitHub Pages setup/upload/deploy actions.
- Confirmed local toolchain:
  - Node.js `v22.21.1` managed through nvm.
  - pnpm `10.21.0`.
  - Git `2.43.0.windows.1`.

## Tests Run

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm validate:plugin`
- `pnpm validate:marketplace`
- `pnpm validate:release`
- `node packages/cli/dist/index.js doctor`
- `node packages/cli/dist/index.js --help`
- `node plugins/codex-audit-canvas/scripts/audit-artifacts.mjs --doctor`

## Known Constraints

- Workspace packages remain private and are distributed through GitHub source and Release assets rather than npm.
- Remote AI providers remain optional and disabled by default.
- The local daily maintenance automation is machine-specific and is intentionally not stored in the repository.

## Published Resources

- Repository: `https://github.com/duiliang/audit-canvas`
- Release: `https://github.com/duiliang/audit-canvas/releases/tag/v0.1.0`
- Pages: `https://duiliang.github.io/audit-canvas/`
- v0.2 backlog: GitHub issues labeled `v0.2`

## Next Required Reads

Before any post-release follow-up, reread:

- `docs/PRODUCT_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/ACCEPTANCE_TESTS.md`
- `docs/BUILD_STATE.md`
- Recent Git log

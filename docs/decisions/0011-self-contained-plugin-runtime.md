# ADR 0011: Ship a Self-Contained Plugin Runtime

- Status: Accepted
- Date: 2026-07-10

## Context

The first plugin scripts located the CLI by walking from the plugin directory to the AuditCanvas
monorepo root. That worked in the source checkout but failed when a marketplace installed only the
plugin directory. The scripts also used the source checkout as their working directory, so an
installed plugin could audit itself instead of the user's active repository.

## Decision

- Bundle `packages/cli/src/index.ts` and its runtime dependencies into
  `plugins/codex-audit-canvas/scripts/audit-canvas-cli.mjs` during the root build.
- Commit the generated bundle and verify in CI that rebuilding it produces no diff.
- Resolve audit and review paths from the plugin launch working directory.
- Allow `AUDIT_CANVAS_WORKSPACE` as an explicit launcher override.
- Test all three plugin workflows from a copied standalone plugin directory against a separate
  temporary Git repository.

## Consequences

- Marketplace installations do not require the monorepo, pnpm, or workspace dependencies at
  runtime; Node.js and Git remain required.
- The generated CLI bundle increases repository size by roughly 500 KB.
- CLI source changes must rebuild and commit the generated plugin bundle.
- Plugin scripts cannot use their own installation path as the audited workspace.

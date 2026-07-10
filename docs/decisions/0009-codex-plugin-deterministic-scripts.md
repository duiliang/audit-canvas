# ADR 0009: Codex Plugin Uses Deterministic Scripts

Date: 2026-07-10

## Status

Accepted

## Context

Codex plugin skills need to invoke AuditCanvas workflows without letting the model infer file formats, report layouts, or finding state transitions. The plugin must remain an adapter over the Web and CLI product.

## Decision

The Codex plugin is packaged under `plugins/codex-audit-canvas/` with `.codex-plugin/plugin.json`, three focused skills, and deterministic scripts:

- `audit-artifacts.mjs`
- `compare-baselines.mjs`
- `resolve-findings.mjs`

The repository exposes the plugin through `.agents/plugins/marketplace.json`. Validation scripts check manifest and marketplace structure during the release gate.

## Consequences

- Codex users get focused workflows without duplicating core logic.
- The plugin can return run IDs and report paths instead of chat summaries.
- The core CLI remains the source of truth for scans and exports.


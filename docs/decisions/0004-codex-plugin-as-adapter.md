# ADR 0004: Codex Plugin as Adapter

Date: 2026-07-10

## Status

Accepted

## Context

The project includes a Codex plugin, but the core product must remain independent. The plugin must not become the only execution path.

## Decision

The Codex plugin invokes deterministic CLI/scripts and links to run artifacts or the Review Canvas. It is packaged under `plugins/codex-audit-canvas/` with focused skills and repo marketplace metadata.

## Consequences

- Web and CLI remain usable without Codex.
- Plugin skills stay small and workflow-specific.
- Plugin validation is part of the release gate but not required to run the core audit engine.


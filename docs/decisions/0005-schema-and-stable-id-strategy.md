# ADR 0005: Schema and Stable ID Strategy

Date: 2026-07-10

## Status

Accepted

## Context

Audit runs must be reproducible, exportable, and validatable across CLI, Web, and plugin workflows. Finding evidence needs stable references even when a model is not involved.

## Decision

Version the audit data model at schema version `0.1.0`. Store JSON Schema and TypeScript types in `@audit-canvas/schema`. Generate stable IDs from schema version, repository identity, paths, line ranges, file hashes, content hashes, rule IDs, and evidence block IDs.

The first deterministic core supports exact duplicate, normalized duplicate, and token-based near duplicate rules. It records full evidence text in each Finding evidence item and exports the same evidence to JSON, Markdown, and HTML.

## Consequences

- Identical input produces stable SourceBlock IDs and Finding IDs.
- Report exports are larger because they preserve full evidence.
- Any future schema change needs a versioned migration path or explicit compatibility note.


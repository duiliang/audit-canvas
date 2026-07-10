# ADR 0001: Local-First Evidence-Preserving Audit Model

Date: 2026-07-10

## Status

Accepted

## Context

The core product risk is AI or report generation hiding repeated evidence through summarization or compression. AuditCanvas must prove that it checked all source blocks and retained complete evidence.

## Decision

AuditCanvas stores source evidence as SourceBlock records with full text, line ranges, heading path, content hash, adjacent block links, and artifact references. Findings store model or rule conclusions separately from evidence references.

Exports and UI views must render every evidence occurrence by default.

## Consequences

- Reports may be larger than summarized reviews.
- UI must optimize scanning without collapsing evidence.
- Tests must assert that duplicate evidence remains complete across JSON, HTML, and UI output.


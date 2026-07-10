# ADR 0007: Dense Review Canvas Instead of Chat UI

Date: 2026-07-10

## Status

Accepted

## Context

AuditCanvas needs users to verify original evidence, coverage, and review state. A chat interface would encourage summarization and hide repeated evidence.

## Decision

The Web app uses a dense four-region workbench:

- Artifact Navigator for files, counts, filters, and coverage.
- Source Viewer for complete source blocks with line ranges and evidence highlighting.
- Finding Panel for category, severity, confidence, status actions, and reviewer comments.
- Evidence Compare for every evidence occurrence, expanded by default.

Additional views provide Trace Matrix, Git Diff, and Finding List tables. Review state is persisted locally in browser storage for the initial MVP.

## Consequences

- The first screen is the actual usable product, not a landing page.
- The UI prioritizes information density and audit accuracy over whiteboard-style visuals.
- Future IndexedDB persistence can replace localStorage without changing the audit data model.


# ADR 0008: Provider Output Validation and Secret Redaction

Date: 2026-07-10

## Status

Accepted

## Context

AI providers can help identify semantic duplicates, contradictions, and ambiguity, but provider output can be malformed, incomplete, or unsafe to log. The product must keep working without providers and must never silently accept model output without evidence.

## Decision

Provider integrations live in `@audit-canvas/providers`. Remote providers require explicit `enabled: true` configuration. Provider output must be JSON with a `findings` array and each finding must cite existing `sourceBlockIds`. Invalid JSON, missing fields, or missing evidence references are recorded as invalid provider diagnostics and do not create valid Findings.

API keys are read from environment variables for remote providers and redacted from diagnostics with shared `redactSecrets` logic.

## Consequences

- Local deterministic auditing remains the default execution path.
- Invalid model output cannot contaminate valid audit reports.
- Provider adapters can be added without changing schema or core parser code.


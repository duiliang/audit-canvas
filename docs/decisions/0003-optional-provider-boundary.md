# ADR 0003: Optional Provider Boundary

Date: 2026-07-10

## Status

Accepted

## Context

AI review can help with semantic duplicates, contradictions, ambiguity, and implementation mismatch. However, source artifacts are sensitive, and the product must work without external services.

## Decision

All model-backed review goes through a Provider interface. Remote providers are disabled by default and require explicit configuration. The deterministic local engine is complete without providers.

Provider output is validated before it can contribute findings. Invalid output is recorded as invalid provider diagnostics.

## Consequences

- Users can run local audits offline.
- Provider adapters can evolve without changing the core audit model.
- Tests must cover invalid provider output and secret redaction.


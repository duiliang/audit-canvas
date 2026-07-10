# ADR 0010: Release Preparation With Static Pages Demo

Date: 2026-07-10

## Status

Accepted

## Context

The project needs a public open-source shape, a real Web screenshot, CI, and a static demo path without claiming official directory listing or completed GitHub publication before those actions happen.

## Decision

Prepare the repository with community files, examples, sample reports, CI, Dependabot, GitHub Pages workflow, Playwright E2E, and a real screenshot generated from the local Vite app. GitHub Pages deploys `apps/web/dist` after the repository is published and Pages is enabled.

Publishing and release creation remain separate external operations gated by GitHub authentication and repository permissions.

## Consequences

- The repository is locally release-ready.
- README can show a real UI screenshot generated from the product.
- Final status must distinguish local completion from remote GitHub publication.


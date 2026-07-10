# ADR 0002: TypeScript pnpm Monorepo

Date: 2026-07-10

## Status

Accepted

## Context

The product needs shared schema, CLI, Web UI, deterministic core, provider adapters, and plugin scripts. A single package would blur boundaries and make validation harder.

## Decision

Use a TypeScript pnpm workspace with packages for schema, core, git, parsers, providers, CLI, and UI, plus a Vite React web app and a Codex plugin folder.

## Consequences

- Shared TypeScript types can be reused across CLI, Web, and tests.
- Package boundaries make optional providers and plugin scripts easier to test.
- Workspace setup adds some release complexity, handled through pnpm scripts and CI.


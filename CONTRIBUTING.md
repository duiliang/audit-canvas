# Contributing

Thanks for contributing to AuditCanvas.

## Development

```powershell
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use focused pull requests. Keep audit invariants intact and add tests for any behavior that touches parsing, finding generation, coverage, exports, provider output, plugin scripts, or review state.

## Commit Style

Use clear conventional-style messages such as:

- `feat(core): add duplicate rule`
- `fix(cli): preserve run metadata`
- `docs: clarify provider privacy`

## Invariants

Do not merge changes that:

- hide duplicate evidence
- replace evidence with an ellipsis marker
- accept provider output without evidence locations
- send source files to remote providers by default
- log API keys or tokens


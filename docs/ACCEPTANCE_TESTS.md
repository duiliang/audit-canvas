# Acceptance Tests

## Required Test Groups

- Schema validation tests.
- Parser tests for Markdown, TXT, JSON, and source text.
- Exact duplicate tests.
- Normalized and near duplicate tests.
- Coverage invariant tests.
- Full evidence preservation tests.
- Git baseline tests.
- Export tests for JSON, Markdown, and HTML.
- Provider mock tests.
- Invalid provider output tests.
- Secret redaction tests.
- CLI integration tests.
- Web component tests.
- Playwright end-to-end tests.
- Plugin manifest validation.
- Marketplace validation.
- Installation smoke test.

## Critical Scenarios

1. When the same paragraph appears three times, all three complete occurrences are visible in JSON, Markdown, HTML, and the UI.
2. Two similar but not identical requirements are compared side by side with both complete texts.
3. Contradictory requirements show complete evidence for each side.
4. Local audit completes without any AI provider configured.
5. Provider output that is invalid JSON is marked invalid and does not enter valid findings.
6. API keys do not appear in logs, exports, reports, UI state, examples, or Git history.
7. Re-running identical input produces stable SourceBlock IDs and Finding IDs.
8. Editing a file changes its hash and creates a new run while preserving old run data.
9. accepted, rejected, resolved, and ignored-with-reason statuses persist.
10. Built Web app runs in GitHub Pages example-data mode.
11. Exported HTML, JSON, and UI text must not contain `...` as a substitute for duplicate evidence.

## Release Gate

Before publishing, all of the following commands must pass:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm validate:plugin
pnpm validate:marketplace
```

Tests must not be deleted or weakened to satisfy the release gate.


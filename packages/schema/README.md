# AuditCanvas schema package

This package owns the versioned JSON contracts shared by AuditCanvas components.

## AuditReview 0.1.0

`AuditReview` persists human review state separately from the immutable `AuditRun` payload. Its maps are keyed by `findingId`:

- `statusByFinding` values use the existing `FindingStatus` contract.
- `commentsByFinding` contains only findings that have a persisted comment.
- `updatedAt` is an RFC 3339 date-time describing the latest persisted change.

Use `AUDIT_CANVAS_REVIEW_SCHEMA_VERSION` when creating records and `validateAuditReview(value)` at storage and transport boundaries. Consumers can also import `auditReviewSchema` or the `./audit-review.schema.json` package export.

Use `applyAuditReview(run, review)` to create an `AuditRun` view with review status, comments, and resolution timestamps merged into its findings. The input objects are not mutated.

When the contract changes incompatibly, add a new schema version and keep readers for persisted older versions until their data has been migrated.

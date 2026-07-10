---
name: audit-artifacts
description: Audit repository or document artifacts with AuditCanvas. Use when the user asks to audit this repository, review this document, inspect all project artifacts, find duplicated or conflicting requirements, open the audit canvas, 审计当前仓库, 检查全部内容, or 查找重复或冲突内容.
---

# Audit Artifacts

## Trigger

Use this skill when the user asks to:

- audit this repository
- review this document
- find duplicated or conflicting requirements
- inspect all project artifacts
- open the audit canvas
- 审计当前仓库
- 检查全部内容
- 查找重复或冲突内容

## Do Not Trigger

Do not use this skill for:

- casual code review without an artifact audit
- applying fixes
- comparing two explicit commits or branches
- provider-only semantic analysis without a local scan

## Workflow

1. Check that AuditCanvas can run by invoking `scripts/audit-artifacts.mjs --doctor`.
2. Run `scripts/audit-artifacts.mjs <target>` where target defaults to `.`.
3. Return the audit run ID, run JSON path, and report paths.
4. Do not replace the audit result with a chat summary. Point the user to the generated Review Canvas or reports.

## Output Contract

Return concise metadata only:

- audit run ID
- `.auditcanvas/runs/<runId>.json`
- `.auditcanvas/reports/<runId>.html`
- coverage and finding count


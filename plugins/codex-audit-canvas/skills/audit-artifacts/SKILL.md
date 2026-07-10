---
name: audit-artifacts
description: 使用 AuditCanvas 审计仓库或文档制品。用户要求审计当前仓库、审查文档、检查全部项目制品、查找重复或冲突需求、打开审计工作台，或提出 audit this repository 等同类请求时使用。
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

1. Keep the command working directory at the user's active repository; do not change into the plugin installation directory.
2. Check that AuditCanvas can run by invoking `scripts/audit-artifacts.mjs --doctor`.
3. Run `scripts/audit-artifacts.mjs <target>` where target defaults to `.`.
4. Return the audit run ID, run JSON path, and report paths.
5. Do not replace the audit result with a chat summary. Point the user to the generated Review Canvas or reports.
6. 除非用户明确要求英文，否则使用中文返回元数据；原始证据、路径和标识符不得翻译。

## Output Contract

Return concise metadata only:

- audit run ID
- `.auditcanvas/runs/<runId>.json`
- `.auditcanvas/reports/<runId>.html`
- coverage and finding count

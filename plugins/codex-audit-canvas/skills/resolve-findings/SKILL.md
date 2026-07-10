---
name: resolve-findings
description: 处理已接受的 AuditCanvas 审计问题。用户要求应用已接受问题、修复已批准的审计问题、根据已接受问题修改或处理审计结论时使用。
---

# Resolve Findings

## Trigger

Use this skill when the user asks to:

- apply accepted findings
- fix approved audit issues
- 根据已接受问题修改
- 处理审计结论

## Do Not Trigger

Do not use this skill for:

- pending findings
- rejected findings
- broad refactors unrelated to accepted audit findings
- changing source files before showing the accepted finding impact

## Workflow

1. Keep the command working directory at the user's active repository; do not change into the plugin installation directory.
2. Run `scripts/resolve-findings.mjs`.
3. Read only accepted findings from the latest AuditCanvas run.
4. Show the impact range before creating any patch.
5. Do not process rejected or pending findings.
6. After edits are explicitly approved, rerun relevant audit and tests.
7. Preserve original evidence history.
8. 除非用户明确要求英文，否则使用中文返回影响范围；原始证据、路径和标识符不得翻译。

## Output Contract

Return:

- count of accepted findings
- impacted files and line ranges
- generated impact report path
- explicit note when no accepted findings exist

---
name: compare-baselines
description: Compare Git baselines with AuditCanvas. Use when the user asks to compare two commits, audit changes since baseline, compare branch with main, 比较两个版本, 检查本次变化, or 基线审计.
---

# Compare Baselines

## Trigger

Use this skill when the user asks to:

- compare two commits
- audit changes since baseline
- compare branch with main
- 比较两个版本
- 检查本次变化
- 基线审计

## Do Not Trigger

Do not use this skill for:

- scanning a single document with no baseline
- applying accepted findings
- unrelated Git history summaries

## Workflow

1. Keep the command working directory at the user's active repository; do not change into the plugin installation directory.
2. Identify baseline and target refs. Default target is `HEAD`; default baseline is `main`.
3. Run `scripts/compare-baselines.mjs --baseline <baseline> --target <target> <path>`.
4. Return the generated run ID and report paths.
5. Keep the baseline and target refs fixed in the response.

## Output Contract

Return:

- baseline ref
- target ref
- audit run ID
- report paths
- finding count

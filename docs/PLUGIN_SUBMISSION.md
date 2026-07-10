# Codex Plugin Submission Notes

AuditCanvas has not been submitted to an official Plugin Directory.

## 中文说明

`codex-audit-canvas` 让 Codex 用户在本地审计仓库和文档制品、比较 Git 基线，并处理已接受的问题，同时确保聊天摘要不会取代完整证据。插件默认使用中文提示和输出；用户明确要求英文时可以切换，原始证据、路径和标识符始终保持原文。

## Introduction

`codex-audit-canvas` lets Codex users run local AuditCanvas artifact audits, compare Git baselines, and process accepted findings without hiding full evidence in chat summaries.

## Privacy

- Data stays local by default.
- The plugin invokes local scripts and CLI commands.
- The plugin ships a standalone CLI bundle and executes it in the user's active workspace.
- Remote AI providers are disabled by default.
- API keys are read from environment variables only when a user explicitly enables a provider.

## Permissions

- Reads repository files selected for audit.
- Writes `.auditcanvas/` run, report, review, and cache folders.
- Does not modify source files during scanning.
- `resolve-findings` must only operate on accepted findings and must show impact before patches.

## Positive Tests

1. Audit a repository and return a run ID.
2. Audit a single Markdown file and preserve all duplicate evidence.
3. Compare `main` with `HEAD`.
4. Generate accepted finding impact report.
5. Open or reference the local Review Canvas report path.

## Negative Tests

1. Pending findings are not modified by `resolve-findings`.
2. Rejected findings are not modified by `resolve-findings`.
3. Missing CLI build triggers a deterministic build or fails with a clear error.

## Starter Prompts

- 使用 AuditCanvas 审计当前仓库。
- 比较当前分支与 main 基线。
- 处理已接受的审计问题。

## Release Checklist

- `pnpm validate:plugin`
- `pnpm validate:marketplace`
- `pnpm validate:release`
- Confirm no official directory status is claimed.
- Confirm plugin scripts call deterministic CLI behavior.
- Confirm the standalone-install test writes only to the user workspace.
- Confirm plugin skills have trigger and non-trigger conditions.

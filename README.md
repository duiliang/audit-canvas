# AuditCanvas

简体中文 | [English](README.en.md)

AuditCanvas 是一个本地优先、感知 Git 的软件制品审计工作台。它保留完整证据、跟踪审计覆盖率，并支持可选 AI 分析器，但不依赖任何模型也能完整运行。

这是一个独立开源项目，Codex 插件只是可选入口。

![AuditCanvas 审计工作台](docs/assets/ui-screenshot.png)

## 解决的问题

- AI 审计经常把重复内容折叠成摘要，导致原始证据丢失。
- 审查者无法确认每个原文块是否都已检查。
- 审计结论缺少稳定的文件路径、章节、行号、commit 和文件哈希引用。
- 需求、代码、测试和 Git 基线通常分散在不同工具中。
- 长对话中的项目基线和关键决策容易丢失。

AuditCanvas 默认展开每一处重复证据。只有显式配置分析器时才会调用 AI，数据默认保留在本地。

## 3 分钟开始

```powershell
git clone https://github.com/duiliang/audit-canvas.git
cd audit-canvas
pnpm install
pnpm build
node packages/cli/dist/index.js scan examples/sample-project
node packages/cli/dist/index.js export --format html
pnpm --filter @audit-canvas/web dev -- --port 4173
```

打开 `http://127.0.0.1:4173`。

`0.1.0` 版本通过 GitHub 源码、Release 和 Codex Marketplace 分发。workspace 子包暂时保持 private，尚未发布到 npm。

## CLI

```powershell
node packages/cli/dist/index.js scan .
node packages/cli/dist/index.js scan docs/
node packages/cli/dist/index.js scan . --baseline HEAD~1
node packages/cli/dist/index.js scan . --baseline main --target HEAD
node packages/cli/dist/index.js export --format html
node packages/cli/dist/index.js export --format json
node packages/cli/dist/index.js verify-coverage
node packages/cli/dist/index.js doctor
```

CLI 和 Markdown/HTML 报告默认使用中文。设置 `AUDIT_CANVAS_LOCALE=en`，或在 `scan`、`export`、`serve` 命令中使用 `--locale en` 可切换英文。JSON 协议数据不会翻译。

CLI 输出写入 `.auditcanvas/`：

```text
.auditcanvas/
  config.json
  runs/
  reports/
  reviews/
  cache/
```

`.auditcanvas/cache/` 默认由 Git 忽略。

## Web 审计工作台

```powershell
pnpm --filter @audit-canvas/web dev
pnpm --filter @audit-canvas/web build
```

Web Review Canvas 包含：

- 制品导航
- 带行号、原文块边界和证据高亮的原文视图
- 支持接受、拒绝、解决和人工批注的问题面板
- 默认完整展开每次出现位置的证据对比
- 追踪矩阵
- Git 差异
- 问题列表
- JSON、Markdown 和 HTML 导出
- 深色模式
- 中文默认界面和英文切换

在线演示：[https://duiliang.github.io/audit-canvas/](https://duiliang.github.io/audit-canvas/)

## Codex 插件

从 GitHub Marketplace 安装：

```powershell
codex plugin marketplace add duiliang/audit-canvas
codex plugin add codex-audit-canvas@audit-canvas
```

本地插件目录：

```text
plugins/codex-audit-canvas
```

发布的插件内含独立 CLI bundle，并始终把审计结果写入 Codex 调用插件时所在的仓库。仅当启动器无法设置工作目录时，才需要设置 `AUDIT_CANVAS_WORKSPACE`。

插件工作流：

- `audit-artifacts`：审计仓库或文档制品
- `compare-baselines`：比较 Git 基线
- `resolve-findings`：处理已接受的审计问题

卸载或升级：

```powershell
codex plugin remove codex-audit-canvas
codex plugin add codex-audit-canvas@audit-canvas
```

## AI 分析器

远程分析器默认关闭。确定性的本地审计不需要任何模型。

当前适配器：

- 测试用 Mock 分析器
- OpenAI-compatible 分析器
- Ollama 分析器

API Key 必须来自环境变量或未来接入的系统安全存储，不得提交、导出、记录日志或显示在 Web 界面中。

## 质量门槛

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm validate:plugin
pnpm validate:marketplace
pnpm validate:release
```

## 项目结构

```text
apps/web
packages/schema
packages/core
packages/git
packages/providers
packages/cli
packages/ui
plugins/codex-audit-canvas
examples
docs
```

## 许可证

MIT，详见 [LICENSE](LICENSE)。

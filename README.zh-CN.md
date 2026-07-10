# AuditCanvas

AuditCanvas 是一个 local-first、Git-aware 的软件制品审计工作台。它保留完整证据、跟踪覆盖率，并支持可选 AI Provider。

这是一个独立开源项目，Codex 插件只是可选入口。

![AuditCanvas 审计工作台](docs/assets/ui-screenshot.png)

## 解决的问题

- AI 审计经常把重复内容折叠成摘要。
- 用户无法确认是否检查了全部原文。
- 审计结论缺少稳定的路径、章节、行号、commit 和文件 hash。
- 需求、代码、测试和 Git 基线割裂。
- 长对话中项目基线和重要决定容易丢失。

AuditCanvas 默认展开每一次重复证据。不配置 Provider 时也能完整运行。数据默认保留在本地。

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

## Codex 插件

```powershell
codex plugin marketplace add duiliang/audit-canvas
codex plugin add codex-audit-canvas@audit-canvas
```

本地插件目录：

```text
plugins/codex-audit-canvas
```

发布的插件内含独立 CLI bundle，并始终把审计结果写入 Codex 调用插件时所在的仓库。仅当启动器无法设置工作目录时，才需要设置 `AUDIT_CANVAS_WORKSPACE`。

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

## 许可证

MIT。详见 [LICENSE](LICENSE)。

# 更新日志

简体中文 | [English](CHANGELOG.en.md)

## 尚未发布

- 修复 Pages 在全新 runner 上构建 Web workspace 依赖的问题。
- 允许通过校验的 GitHub Pages Actions 升级到当前最低主版本以上。
- 增加 Web favicon，消除线上页面的浏览器控制台 404。
- 将 Web 和项目展示默认语言改为中文，同时保留英文版本与切换能力。

## 0.1.0

- 增加产品契约、架构、验收测试、路线图和 ADR。
- 增加版本化 schema 和确定性本地审计核心。
- 增加 `scan`、`export`、`verify-coverage`、`doctor` 和 `serve` CLI 命令。
- 增加 React/Vite 审计工作台。
- 增加 Mock、OpenAI-compatible 和 Ollama 可选分析器适配器。
- 增加 Codex 插件和仓库 Marketplace 元数据。
- 增加开源发布文件、示例、CI 和 Pages 工作流。
- 增加 `duiliang/audit-canvas` 发布元数据校验。
- 使 Pages 部署流程与当前 GitHub Pages Actions 保持一致。
- 将 Codex 插件改为自包含，并增加独立安装工作区测试。
- 在 CI 中强制执行单元和集成测试覆盖率门槛。
- 将内部 workspace 子包标记为 private，明确 v0.1 仅通过 GitHub 分发。

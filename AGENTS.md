# AGENTS.md — CyberSmoke 项目协作约定

本文件供 AI 编码代理（ZCode 等）及人类协作者在本仓库工作时遵守。

## 项目概况

- **名称**：CyberSmoke（赛博吸烟）
- **形态**：微信小程序，原生框架 + TypeScript
- **定位**：赛博朋克风格的虚拟「吸烟」互动体验（纯属虚拟，不提倡吸烟）
- **账号**：使用本地测试号（`wx15f3379c42b9e3e0`，由开发者工具申请的测试 AppID）开发调试

## 技术栈与结构

- 小程序源码位于 `miniprogram/`（`project.config.json` 中 `miniprogramRoot` 指向此处）
- TypeScript strict 模式；`.ts` 由微信开发者工具内置插件编译为同目录 `.js`
- 编译产物 `miniprogram/**/*.js` 与 `node_modules/`、`tmp/` 均不入库（见 `.gitignore`）
- `reference/` 存放设计与开发约定文档；`reference/design/` 为玩法与技术选型记录

## 工作流约定（必须遵守）

1. 项目初始化使用 `init` 命令（`git init` / `npm init`）。
2. 每次完成用户指令且编译通过后，执行一次 Git 提交（只提交重要内容）。
3. 提交后重新运行并调试，确认功能正常；如调试产生修复，修复后再次编译并提交。
4. 测试与临时产物统一放在 `tmp/` 下，不入库。
5. 用户可见变更同步更新 `CHANGELOG.md`（写入 `Unreleased` 段，发布时再定版本号）。

## 代码与调试规范

- 提交前运行 `npx tsc --noEmit` 通过后再编译。
- 调试以微信开发者工具为准：模拟器 + Console；需要真机验证时用预览/真机调试。
- 本地开发不校验合法域名（`urlCheck: false`），正式发布前接口域名必须 HTTPS 且在后台配置白名单。
- 音效与 tabBar 图标由 `scripts/gen-*.mjs` 生成，调整素材后重跑脚本，不要手改二进制文件。
- 自动化测试在 `tmp/` 下：`e2e-smoke.mjs`（端到端）、`unit-balance.mjs`（数值）、`console-probe.mjs`（报错监听）。

## 合规红线

- 不出现真实烟草品牌与购买引导。
- 页面保留「纯属虚拟，不提倡吸烟」声明。
- 概率类玩法必须公示概率。
- 视觉风格走抽象的赛博雾气/霓虹能量方向，弱化写实吸烟元素（题材有审核风险，详见 `reference/design/01-技术选型与环境搭建.md`）。

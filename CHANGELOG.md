# Changelog

本项目所有重要变更都会记录在本文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 核心玩法：点火 → 长按吸入 → 松手吐雾三段式交互，Canvas 霓虹烟雾粒子系统（含蓄力条、火星呼吸、火柴划燃动画）
- 技能系统：5 个里程碑技能——点烟手法(5)、烟圈大师(20)、深吸(50)、赛博吐纳(100)、二手烟领域(300)
- 烟款图鉴：细支数据流 / 赛博雪茄 / 电子雾化棒 v2，用尼古丁购买并装备，影响粒子配色与收益倍率
- 称号阶梯：6 级称号随累计支数晋升（新手指间夹烟 → 赛博老烟枪）
- 本地存档：尼古丁、累计支数、烟款拥有与装备状态自动保存
- 底部 tabBar：抽烟 / 技能 / 图鉴
- 自动化端到端测试脚本：`tmp/e2e-smoke.mjs`（miniprogram-automator 驱动完整抽烟循环）

### Changed

- `project.config.json` 的 appid 从 `touristappid` 改为开发者工具申请的本地测试号 `wx15f3379c42b9e3e0`（CLI 命令行调用因此可用）

## [0.1.0] - 2026-09-12

### Added

- 初始化微信小程序脚手架（原生框架 + TypeScript，`miniprogram/` 目录结构）
- 首页占位页面：赛博朋克暗色风 UI、抽烟计数与尼古丁展示、点火按钮占位
- 项目文档：README.md、AGENTS.md、CHANGELOG.md
- `reference/design/`：技术选型与环境搭建、玩法与奖励机制设计两份讨论记录
- 开发约定：测试内容入 `tmp/`（不入库）、编译后 Git 提交、提交后重新运行调试

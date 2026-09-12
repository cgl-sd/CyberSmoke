# Changelog

本项目所有重要变更都会记录在本文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Changed

- `project.config.json` 的 appid 从 `touristappid` 改为开发者工具申请的本地测试号 `wx15f3379c42b9e3e0`（CLI 命令行调用因此可用）

## [0.1.0] - 2026-09-12

### Added

- 初始化微信小程序脚手架（原生框架 + TypeScript，`miniprogram/` 目录结构）
- 首页占位页面：赛博朋克暗色风 UI、抽烟计数与尼古丁展示、点火按钮占位
- 项目文档：README.md、AGENTS.md、CHANGELOG.md
- `reference/design/`：技术选型与环境搭建、玩法与奖励机制设计两份讨论记录
- 开发约定：测试内容入 `tmp/`（不入库）、编译后 Git 提交、提交后重新运行调试

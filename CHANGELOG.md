# Changelog

本项目所有重要变更都会记录在本文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.2.0] - 2026-09-13

核心玩法按 `reference/CyberSmoke_烟圈挑战模式设计与开发规格.md` 重做。

### Added

- **烟圈挑战核心玩法**：点火 → 长按蓄力（Perfect Zone 45%~72%，越按满越扣分）→ 松手吐雾 → 手指画圈 → 评分结算的状态机（规格 §3-§11）
- **烟圈识别**：闭合度/圆度/流畅度/尺寸/时间五维纯函数评分 + 蓄力修正 + C/B/A/S/PERFECT/LEGEND 评级 + Combo 系统（A+ 连击，低于 A 清零）
- **主线关卡**：第一章 20 个配置关卡（目标 ≤3 个、二星分数线、难度递增、顺序解锁、1~3 星记录，规格 AC-011/012/013）
- **无限吐雾**：Round 目标确定性生成、难度每 5 轮 +1、3 颗心、里程碑奖励与最高纪录（规格 §21-§23）
- **玩家成长**：Lv.1+ 经验曲线（100+level×30）、升级货币奖励、Lv.5 解锁无限模式
- **每日任务**：同日确定性生成 3 个任务、跨自然日刷新、完成发奖励（AC-021/022）
- **烟圈图鉴**：Basic/Thin/Giant/Swift/Ghost/Eclipse/Perfect Halo 七种形态条件解锁 + 6 项成就
- **三 tab 信息架构**：玩 / 收藏 / 我的（规格 §30，核心游玩页 HUD 极简：1 目标 + 2 数值 + 1 提示）
- 音效：点火/吸入/吐雾/得分/PERFECT；震动：点火短震、Perfect 区间轻震、PERFECT 双短震

### Changed

- 视觉对齐 Reference：#090A0C 黑底 + #E8EEEE 白烟 + #75F4D2 薄荷青高亮 + 真实香烟形态（烟头火星/灰烬/烟纸/滤嘴）
- 存档升级 v3（Player 结构，规格 §35）；旧版存档按新档处理

### Removed

- 旧版放置/收集玩法（焦油、烟蒂抽奖、烟灰炉、试炼闯关、晨烟连击、戒烟挑战）及对应页面，历史见 Git 记录

### Fixed

- 烟圈质量加权和被错误钳制到 0~1 的计算错误（测试发现）

## [0.1.0] - 2026-09-12

### Added

- 初始化微信小程序脚手架（原生框架 + TypeScript，`miniprogram/` 目录结构）
- 首页占位页面：赛博朋克暗色风 UI、抽烟计数与尼古丁展示、点火按钮占位
- 项目文档：README.md、AGENTS.md、CHANGELOG.md
- `reference/design/`：技术选型与环境搭建、玩法与奖励机制设计两份讨论记录
- MVP 核心玩法与二期玩法（三步曲交互、技能树、图鉴、称号、试炼、焦油/烟蒂/烟灰炉、每日晨烟、戒烟结局、音效与图标）
- 自动化测试：端到端（miniprogram-automator）、数值单元测试、Console 探针

### Changed

- `project.config.json` 的 appid 从 `touristappid` 改为开发者工具申请的本地测试号 `wx15f3379c42b9e3e0`（CLI 命令行调用因此可用）

### Fixed

- 渲染层错误（webviewScriptError: reading 'pageX'）：自动化测试空触摸载荷所致，已修复并加固画布渲染生命周期

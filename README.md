# CyberSmoke 赛博吸烟

> 赛博朋克风格的虚拟「吸烟」互动体验微信小程序。
> **纯属虚拟体验，不提倡吸烟。**

## 玩法一览（烟圈挑战 V1，规格见 reference/）

- **核心循环**：点火 → 长按蓄力（命中 Perfect Zone 收益最高，按满反而扣分）→ 松手吐雾 → 手指画圈 → 五维评分（闭合/圆度/流畅/尺寸/时间）→ C/B/A/S/PERFECT/LEGEND 评级 → Combo 连击 → 奖励
- **主线关卡**：第一章 20 关，每关最多 3 目标、1~3 星、顺序解锁
- **无限吐雾**：Round 目标持续生成，难度每 5 轮 +1，3 颗心，里程碑奖励
- **成长**：Lv.1+ 经验与等级奖励；每日 3 任务跨日刷新
- **收藏**：烟圈形态图鉴（Basic/Thin/Giant/Swift/Ghost/Eclipse/Perfect Halo）+ 成就
- **视觉**：黑底白烟薄荷青，真实香烟形态，大面积留白

## 技术栈

- 微信小程序原生框架：WXML / WXSS / JSON
- TypeScript（strict 模式，由微信开发者工具内置编译插件编译）
- 版本控制：Git，变更记录见 [CHANGELOG.md](CHANGELOG.md)

## 目录结构

```
CyberSmoke/
├── miniprogram/          # 小程序源码（miniprogramRoot）
│   ├── app.ts / app.json / app.wxss
│   └── pages/index/      # 首页：抽烟主界面
├── typings/              # 全局类型定义（IAppOption 等）
├── reference/            # 设计与开发约定文档
│   └── design/
├── tmp/                  # 测试与临时产物（不入库）
├── project.config.json   # 微信开发者工具项目配置
└── tsconfig.json
```

## 环境要求

- Node.js ≥ 18（本机 v22.23.2）
- 微信开发者工具（macOS：`/Applications/wechatwebdevtools.app`）
- 本项目使用**测试号（游客模式）**，无需注册正式 AppID

## 快速开始

```bash
npm install        # 安装 TS 依赖（类型检查用）
npx tsc --noEmit   # 类型检查
```

用微信开发者工具「导入项目」选择本目录，或命令行：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project "$(pwd)"
```

## 工具脚本与测试

- `scripts/gen-sounds.mjs`：合成音效 WAV（改音效后重跑）
- `scripts/gen-icons.mjs`：生成 tabBar 图标 PNG
- `tmp/unit-balance.mjs`：数值/概率/日期纯函数单元测试
- `tmp/e2e-smoke.mjs`：miniprogram-automator 端到端测试（需开发者工具开服务端口）
- `tmp/console-probe.mjs`：跑完整循环并监听应用报错

## 开发约定（重要）

1. 每次完成开发并编译通过后，必须用 Git 提交一次（只提交重要内容，编译产物与测试产物不入库）。
2. 提交后需重新运行并调试，确认功能正常。
3. 测试相关内容统一放在 `tmp/` 下（已 gitignore）。
4. 设计与开发约定文档放 `reference/` 目录。
5. 用户可见变更需同步更新 `CHANGELOG.md`。
6. 合规红线：不出现真实烟草品牌、页面保留「纯属虚拟，不提倡吸烟」声明、概率玩法需公示概率。

更多背景见 [AGENTS.md](AGENTS.md) 与 [reference/design/](reference/design/)。

# CyberSmoke 赛博吸烟

> 赛博朋克风格的虚拟「吸烟」互动体验微信小程序。
> **纯属虚拟体验，不提倡吸烟。**

## 玩法一览

- **抽烟三步曲**：点火 → 长按吸入（蓄力）→ 松手吐雾（Canvas 霓虹粒子）
- **经济**：尼古丁（主货币）+ 焦油（负资源，满 100 咳嗽减益）+ 烟蒂（10 个合成抽奖，概率已公示）+ 烟灰炉（离线放置收益）
- **成长**：6 个里程碑技能、7 级称号（含戒烟结局「清醒者」）、每日晨烟连击
- **图鉴**：3 款烟，不同粒子配色与收益倍率

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

## 开发约定（重要）

1. 每次完成开发并编译通过后，必须用 Git 提交一次（只提交重要内容，编译产物与测试产物不入库）。
2. 提交后需重新运行并调试，确认功能正常。
3. 测试相关内容统一放在 `tmp/` 下（已 gitignore）。
4. 设计与开发约定文档放 `reference/` 目录。
5. 用户可见变更需同步更新 `CHANGELOG.md`。
6. 合规红线：不出现真实烟草品牌、页面保留「纯属虚拟，不提倡吸烟」声明、概率玩法需公示概率。

更多背景见 [AGENTS.md](AGENTS.md) 与 [reference/design/](reference/design/)。

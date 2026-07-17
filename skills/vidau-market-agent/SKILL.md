---
name: vidau-market-agent
description: Vidau marketing full-case agent. TTS/Amazon plans, charts, Feishu export.
version: 1.0.0
platforms: [macos, linux, windows]
metadata:
  hermes:
    tags: [marketing, tiktok, amazon, feishu, vidau]
    category: productivity
---

# Vidau Market Agent

Vidau 营销全案策划师 — 一键入口。输出署名 **Vidau**；飞书导出用 `node scripts/feishu-export.js`（禁止 Hermes 内置飞书插件）。

## When to Use

用户输入 `/vidau-market-agent` 或要做：

- TikTok Shop / Amazon 市场分析、增长全案、合作提案、运营测算
- 品牌营销审计、竞品、SEO、广告、上市方案
- Markdown 报告 + QuickChart 图表 + 导出飞书

## 前置：工作区必须是本仓库

本 skill 是**编排入口**；脚本与模板在仓库根目录，不是单独 skill 包。

1. 若未克隆：

```bash
git clone https://github.com/vidaudeveloper/market-agent.git
cd market-agent
npm install
```

2. 在 Hermes 中把 **workspace / 工作目录** 设为上述 `market-agent` 根目录。

3. 确认 `terminal.backend: local`（飞书 OAuth 需读写本机 `auth/feishu-user.json`）。
4. 导出飞书前：用户按 `FEISHU-APP-SETUP.md` 填 `.env`，再 `feishu-connect.bat`（见 `FEISHU-USER-GUIDE.md`）；勿用 Hermes 内置飞书。

## 启动流程（每次 /vidau-market-agent）

```
1. 读工作区根目录 AGENT.md
2. 读 skills/PROJECT-FACTS.md + DELIVERY-STANDARD.md + WORKFLOW-CLIENT-ANALYSIS.md
3. Intake 后创建 output/{project}-project-facts.json
4. 若已配置 vidau-market MCP → 优先调 MCP tools（见 MCP-USER-GUIDE.md），勿手写 shell
5. 按用户意图选子 skill（见 AGENT.md 路由表）
6. 客户任务：**默认双轨**；两轨结果统一写入 Project Facts
7. validate + 目标 skill gate；BLOCKER 未清零不写最终稿
8. 识别达人需求 → intake-creator-agent → agent-ask 续聊名单
9. 报告写入 output/ → **默认** feishu_export / feishu-export --charts
```

### MCP 优先规则

当 Cursor/Hermes 已启用 `vidau-market` MCP 时：

| 任务 | 用 MCP 工具 |
|------|-------------|
| 检查授权 | `auth_status` |
| 创建/更新事实包 | `project_facts_init` / `project_facts_merge` |
| 事实校验/门禁 | `project_facts_validate` / `project_facts_gate` |
| 飞书连接 | `auth_feishu_connect` |
| 出海匠登录 | `auth_chuhaijiang_login` |
| TikTok 数据采集 | `chuhaijiang_pipeline` |
| Agent 对话 / 达人名单 | `chuhaijiang_agent_ask` |
| 导出飞书 | `feishu_export` |
| 列/读报告 | `list_reports` / `read_report` |

未配置 MCP 时，回退到下方 shell 命令。

## 配置（勿误导用户）

| 项 | 需要吗 |
|----|--------|
| `AI_API_KEY` | **否**（Agent 写报告 + QuickChart 出图） |
| 飞书 `.env` | 用户自建应用写入本机 `.env` + OAuth 一次 |
| `auth.json` | 仅出海匠 TikTok 数据时需要 |

**禁止**提示用户填写 `AI_API_KEY`，除非明确要求 `ai-analyze.js` 或 `--charts-ai`。

## 子 skill 路由（摘要）

| 用户意图 | 读 |
|----------|-----|
| TTS 全案 / 布局 TikTok | `skills/tts-full-case/SKILL.md` |
| TTS 增长全案 | `skills/tts-growth-plan/SKILL.md` |
| TTS 合作报价 | `skills/tts-partnership-proposal/SKILL.md` |
| 运营测算 | `skills/tts-operation-model/SKILL.md` |
| Amazon 代运营 | `skills/amazon-agency-plan/SKILL.md` |
| 导出飞书 | `skills/feishu-export/SKILL.md` |
| 图表 | `skills/market-chart/SKILL.md` |

完整路由见 `AGENT.md`。

## 飞书导出（强制命令）

```bash
node scripts/feishu-auth.js --status
node scripts/feishu-export.js output/报告.md "文档标题" --charts
```

## 对话开场

加载本 skill 后，用一句话确认工作区路径，并问用户今天要做的营销任务（可给 3 个示例：TTS 全案、竞品分析+飞书、Amazon 代运营）。

若工作区不是 `market-agent` 仓库根目录，先引导用户 clone 并 Open Folder，再继续。

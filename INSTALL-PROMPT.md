# Vidau Market Agent — 安装提示词

> 把下方 **英文提示词** 整段复制给 Hermes / Cursor / Vidau Agent，用于自动完成本仓库的安装与验证。  
> 仓库地址：https://github.com/vidaudeveloper/market-agent

---

## 复制给 Agent 的提示词（English）

```
Set up Vidau Market Agent for me.

Read the agent workflow first:
https://github.com/vidaudeveloper/market-agent/blob/main/AGENT.md

Also read the environment guide (do NOT ask me for AI_API_KEY unless I explicitly need ai-analyze.js or --charts-ai):
https://github.com/vidaudeveloper/market-agent/blob/main/ENV_SETUP.md

Clone or open this repository, then install dependencies and verify the toolchain works:

Repository:
https://github.com/vidaudeveloper/market-agent

If the folder is not on my machine yet, run:
git clone https://github.com/vidaudeveloper/market-agent.git
cd market-agent

Install:
- Windows: run install-all.bat (or setup.bat step by step)
- Mac/Linux: bash install-all.sh (or bash setup.sh)
- Or: npm install && npx playwright install chromium

Register Hermes slash command /vidau-market-agent (after clone):
- Windows: install-hermes-skill.bat (included in install-all.bat)
- Mac/Linux: bash scripts/install-hermes-skill.sh
- See: https://github.com/vidaudeveloper/market-agent/blob/main/HERMES.md

Install chuhaijiang open-platform MCP + SkillHub skill (same as my previous manual flow):
- node scripts/install-chuhaijiang-skillhub.js
- node scripts/install-chuhaijiang-open-mcp.js
- Read the installed skill's references/setup.md
- Ask me: "Do you have a chuhaijiang API Key (sk_live_...)?"
  If yes: run install-chuhaijiang-open-mcp.js --api-key <key>
  If no: guide me to https://developer.chuhaijiang.com to create one, then write the key
- Hermes: /reload-mcp
- Verify by calling chuhaijiang MCP account_info (tool name may be prefixed, e.g. mcp__chuhaijiang__account_info)

Two chuhaijiang systems (explain briefly after install):
- vidau-market MCP (repo): Playwright pipeline, feishu export, auth_chuhaijiang_login
- chuhaijiang HTTP MCP (open platform): search/get_detail API via X-API-Key

Requirements: Node.js 18+

Use Vidau Market Agent when I need:
- TikTok Shop / Amazon marketing analysis and full-case proposals (TTS growth plan, partnership proposal, operation model)
- Brand, competitor, SEO, ads, and launch marketing reports
- Markdown reports with QuickChart diagrams exported to my Feishu (Lark) docs
- TikTok commerce data via chuhaijiang (when auth.json is configured)

Important constraints:
- Read skills from skills/ per AGENT.md routing; for TTS full cases start with skills/DELIVERY-STANDARD.md and skills/tts-full-case/SKILL.md
- Feishu export MUST use: node scripts/feishu-export.js (NEVER Hermes built-in Feishu plugins)
- Before Feishu export: user creates own Feishu app per FEISHU-APP-SETUP.md and fills local .env (not in git)
- First-time connect: feishu-connect.bat or bash scripts/feishu-connect.sh
- Guides: FEISHU-APP-SETUP.md, FEISHU-USER-GUIDE.md
- Default export includes charts: node scripts/feishu-export.js output/report.md "Title" --charts
- QuickChart charts do NOT require AI_API_KEY; do not prompt me to fill AI_API_KEY for normal report + Feishu export workflow
- If Feishu OAuth shows no permission: check app published + availability scope includes user (FEISHU-APP-SETUP.md); do NOT use Hermes Feishu settings

After setup, verify in order:
1. node -v (18+)
2. copy .env.example .env if missing; guide me through FEISHU-APP-SETUP.md if I need Feishu export
3. node scripts/feishu-diagnose.js
4. feishu-connect.bat if not connected

Optional verification export (ask me before running if no sample report exists):
node scripts/feishu-export.js output/飞书导出测试.md "Vidau Market Agent 安装验证" --charts
(If output/ has no test file, create a minimal markdown with one table and <!-- chart:doughnut --> first.)

After setup, register the slash skill and open the repo as workspace:

Windows: install-hermes-skill.bat
Mac/Linux: bash scripts/install-hermes-skill.sh
Docs: https://github.com/vidaudeveloper/market-agent/blob/main/HERMES.md

Then in Hermes chat: /reload-skills
Verify: type / and confirm /vidau-market-agent appears.
Run: /vidau-market-agent

The workspace MUST be the cloned market-agent repo root (for AGENT.md, scripts/, output/).
https://github.com/vidaudeveloper/market-agent

If I am logged in to GitHub, ask me whether you should star it for me as a quick demo that browser interaction works. Only click the star if I explicitly say yes.

If I am not logged in to GitHub, open the repository README in the browser so I can see the project overview.

After that, ask me what marketing task I want first, for example:
- "Layout TikTok for [brand], export to Feishu"
- "Analyze [URL] competitors and write a growth plan"
- "Export an existing report in output/ to Feishu with charts"

If the task needs my product links, GMV targets, Feishu OAuth, or chuhaijiang login, pause and ask me before continuing.
```

---

## 中文说明（给人看）

| 步骤 | Agent 应做什么 |
|------|----------------|
| 1 | 读 `AGENT.md`、`ENV_SETUP.md` |
| 2 | `git clone` + `npm install` |
| 3 | 检查 Node、飞书连接状态 |
| 4 | **不要**索要 `AI_API_KEY`（除非要用 `ai-analyze.js`） |
| 5 | 需飞书时引导用户按 **FEISHU-APP-SETUP.md** 填 `.env`，再 `feishu-connect.bat` |
| 5b | SkillHub 装出海匠 skill + 开放平台 MCP + 引导填 `sk_live_` API Key + 验证 `account_info` |
| 6 | 可选：导出测试稿到飞书验证 |
| 7 | 运行 `install-hermes-skill.bat` / `install-hermes-skill.sh`，`/reload-skills` 后出现 `/vidau-market-agent` |
| 8 | 浏览器打开 GitHub 仓库；登录时可问是否 star |
| 9 | 询问第一个营销任务 |

---

## 链接清单（已写入提示词）

| 用途 | 链接 |
|------|------|
| 仓库首页 | https://github.com/vidaudeveloper/market-agent |
| Agent 工作流 | https://github.com/vidaudeveloper/market-agent/blob/main/AGENT.md |
| 环境说明 | https://github.com/vidaudeveloper/market-agent/blob/main/ENV_SETUP.md |
| Skills 目录 | https://github.com/vidaudeveloper/market-agent/tree/main/skills |
| 飞书导出 Skill | https://github.com/vidaudeveloper/market-agent/blob/main/skills/feishu-export/SKILL.md |
| TTS 全案编排 | https://github.com/vidaudeveloper/market-agent/blob/main/skills/tts-full-case/SKILL.md |
| Hermes 斜杠技能 | https://github.com/vidaudeveloper/market-agent/blob/main/HERMES.md |
| **飞书普通用户指南** | https://github.com/vidaudeveloper/market-agent/blob/main/FEISHU-USER-GUIDE.md |
| **飞书应用自建** | https://github.com/vidaudeveloper/market-agent/blob/main/FEISHU-APP-SETUP.md |

---

## 尚缺、需你补充的链接（可选）

以下内容在 BrowserAct 示例里有对应物，**本仓库目前没有**，你若提供后可补进提示词：

| 缺项 | 说明 | 你可提供 |
|------|------|----------|
| **Vidau 产品官网** | BrowserAct 有 `browseract.com` 未登录时的落地页 | 例如 `https://vidau.ai` 或公司官网 URL |
| **Hermes 专用安装文档** | 若 Hermes 有固定「添加 Agent 文件夹」帮助页 | Hermes 文档链接 |
| **演示用飞书文档** | 安装验证后可打开的样例飞书链接 | 一篇公开的示例 docx 链接 |
| **出海匠 / 数据平台** | 非必须 | `https://www.chuhaijiang.com` 已可手写，无需 Key |

提供以上任意链接后，说一声即可更新本文件。

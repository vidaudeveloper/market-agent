# AI营销全案策划师（Vidau Market Agent）

> **10 分钟上手，一个文件夹搞定全链路营销分析与方案交付**

**仓库：** [github.com/vidaudeveloper/market-agent](https://github.com/vidaudeveloper/market-agent)

**Hermes / Agent 一键安装：** 同事请看 **[`同事安装指南.md`](同事安装指南.md)**；高级用户可用 [`INSTALL-PROMPT.md`](INSTALL-PROMPT.md) 英文提示词。斜杠技能见 [`HERMES.md`](HERMES.md)（`/vidau-market-agent`）。

把这个文件夹放进 Cursor / WorkBuddy / Hermes 等 AI 助手中，即可获得完整的市场营销全案工作台。AI 会读取 `skills/` 技能库，执行品牌分析、竞品调研、SEO 审计、广告创意、上市策划、**飞书文档导出**等任务。

---

## 📦 快速开始（3 步）

### 1️⃣ 安装依赖

| 系统 | 操作 |
|------|------|
| **Windows** | 双击 `setup.bat` |
| **Mac / Linux** | 终端执行 `bash setup.sh` |
| **手动** | 在本文件夹内执行 `npm install` |

> 仅需 Node.js 18+，无需数据库、无需部署。

### 2️⃣ 配置说明

> 详见 [`ENV_SETUP.md`](ENV_SETUP.md)

| 配置项 | 谁需要填 | 何时需要 |
|--------|----------|----------|
| **无**（用 Hermes/Agent 写报告） | 普通用户 | 直接对话，**不要填 AI_API_KEY** |
| `FEISHU_APP_ID` / `SECRET` | **向管理员索取** | 复制 `.env.example` → `.env` 后填入；**不在 Git 仓库中** |
| 飞书 OAuth「同意」 | 各用户本机一次 | `feishu-connect.bat` 浏览器授权 |
| `AI_API_KEY` | 可选 | 仅 `ai-analyze.js` 或 `--charts-ai` |
| `auth.json` | 各用户 | 仅出海匠 TikTok 数据 |

```bash
git clone https://github.com/vidaudeveloper/market-agent.git
cd market-agent
npm install             # 或双击 setup.bat
# 复制 .env.example → .env，填入管理员提供的飞书凭证
# 首次导出前运行 feishu-connect.bat
```

### 3️⃣ 在 Cursor / Hermes 中打开本文件夹

```
D:\AAA-agent\AI营销全案策划师
```

**推荐**：运行 `install-mcp.bat`（或 `bash install-mcp.sh`）启用 **vidau-market MCP**，见 [`MCP-USER-GUIDE.md`](MCP-USER-GUIDE.md)。

直接对话示例：

```
"帮我分析 https://xxx.com 的品牌定位"
"做一份未来三个月的市场策划并导出到飞书"
"查 TikTok 美区店铺销量前三"
```

---

## 📤 飞书导出

> [`FEISHU-APP-SETUP.md`](FEISHU-APP-SETUP.md) 创建应用 → [`FEISHU-USER-GUIDE.md`](FEISHU-USER-GUIDE.md) 连接与导出

将 `output/` 报告导出到**授权用户自己的飞书云文档**。仓库 `.env` 已含团队共用飞书应用凭证。

### 流程

1. `git clone` 后直接使用仓库 `.env`
2. 双击 **`feishu-connect.bat`** 浏览器授权（每人一次）
3. `node scripts/feishu-export.js output/报告.md "标题" --charts`

勿用 Hermes 内置飞书插件。

### 飞书常见问题

| 问题 | 处理 |
|------|------|
| 20029 重定向 URL 有误 | 检查飞书后台 8787 回调是否已添加并发布应用 |
| 8787 端口被占用 | 关闭其他授权窗口；脚本会自动尝试释放端口 |
| 文档进谁的飞书？ | OAuth 授权时登录的飞书账号 |
| 换电脑 | 新电脑重新 `feishu-connect`；`.env` 可拷贝 |
| 无使用权限 | 应用未发布或可用范围不含你 → `FEISHU-APP-SETUP.md` |
| 未配置应用 | `node scripts/feishu-diagnose.js` 检查 `.env` |
| 导出后能编辑吗？ | 是，导出后自动转移所有权；若仍不可编辑请重新 OAuth 授权 |

---

## 📋 数据来源标注

报告中的**具体数字、KPI、评分**须在数据块下方标注来源，末尾附「数据来源汇总」。规范：**`skills/DATA-SOURCE.md`**

---

## 🧠 能力地图

### 营销分析（15 个技能）

| 技能 | 触发词 | 产出 |
|------|--------|------|
| 品牌声调 | 品牌调性、品牌定位 | `BRAND-VOICE.md` |
| 竞品情报 | 竞品对比 | `COMPETITOR-REPORT.md` |
| 营销审计 | 全面诊断 | `MARKETING-AUDIT.md` |
| 营销报告 | 综合报告 | `MARKETING-REPORT.md` |
| 转化漏斗 | 漏斗分析 | `FUNNEL-ANALYSIS.md` |
| 落地页 CRO | 转化率优化 | `LANDING-CRO.md` |
| SEO 审计 | SEO 分析 | `SEO-AUDIT.md` |
| 文案优化 | 改写 copy | `COPY-SUGGESTIONS.md` |
| 邮件序列 | 邮件营销 | `EMAIL-SEQUENCES.md` |
| 社媒日历 | 发帖计划 | `SOCIAL-CALENDAR.md` |
| 广告创意 | 广告 campaign | `AD-CAMPAIGNS.md` |
| 产品上市 | launch 计划 | `LAUNCH-PLAYBOOK.md` |
| 客户提案 | 生成提案 | `PROPOSAL.md` |
| PDF 报告 | 导出 PDF | `MARKETING-REPORT.pdf` |
| **飞书导出** | 导出到飞书 | 飞书云文档链接 |

### 数据查询

| 工具 | 说明 |
|------|------|
| 出海匠 TikTok | `node scripts/chuhaijiang-fetch.js` |

---

## 🗂️ 文件夹结构

```
D:\AAA-agent\AI营销全案策划师\
├── README.md              ← 本说明（给人看）
├── AGENT.md               ← AI 工作流程（给 Agent 看）
├── TOOLS.md               ← 工具目录
├── .env                   ← 飞书应用凭证（团队共用，已纳入仓库）
├── .env.example           ← 配置模板
├── FEISHU-APP-SETUP.md    ← 创建飞书自建应用
├── FEISHU-USER-GUIDE.md   ← 连接与导出
├── setup.bat / setup.sh   ← 一键安装
├── scripts/
│   ├── feishu-auth.js     ← 飞书 OAuth（自动开浏览器）
│   ├── feishu-export.js   ← 导出到用户飞书
│   ├── feishu-lib.js      ← 飞书共享库
│   ├── chuhaijiang-fetch.js
│   └── ai-analyze.js
├── skills/                ← 15 个技能 + DATA-SOURCE.md
├── auth/
│   └── feishu-user.json   ← 本机飞书凭证（自动生成）
└── output/                ← 报告输出目录
```

---

## 📤 分发给其他用户

1. `git clone` 或复制整个项目文件夹  
2. 导出飞书前在本机 `.env` 已有团队飞书凭证；**写报告无需 AI_API_KEY**  
3. 运行 `setup.bat` / `npm install`，在 Hermes / Cursor 打开文件夹  
4. 飞书导出：用户本机浏览器 OAuth 一次即可  

详见 **`ENV_SETUP.md`**。`auth/feishu-user.json` 勿提交 Git。

---

## ⚠️ 常见问题

**Q: 需要科学上网吗？**  
A: 分析国内网站、飞书 OAuth、出海匠一般不需要。部分 MCP 可能需要。

**Q: 需要填 AI API Key 吗？**  
A: **用 Hermes/Agent 写报告、QuickChart 出图、导出飞书 → 不需要。** 仅运行 `ai-analyze.js` 或 `--charts-ai` 时才需要 `.env` 中的 `AI_API_KEY`。

**Q: 支持哪些 AI？**  
A: Agent 对话用 Hermes/Cursor 自带模型。可选 `AI_API_KEY` 支持 OpenAI、DeepSeek 等兼容接口（见 `ai-analyze.js`）。

**Q: 可以改名/移动文件夹吗？**  
A: 可以。在 Cursor 中重新 **Open Folder** 指向新路径即可；`.env` 和 `auth/` 会随文件夹一起带走。

**Q: 飞书需要单独做网页吗？**  
A: 不需要，脚本自动打开浏览器完成 OAuth。

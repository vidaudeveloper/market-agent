# AI营销全案策划师（Vidau Market Agent）

> **10 分钟上手，一个文件夹搞定全链路营销分析与方案交付**

**仓库：** [github.com/vidaudeveloper/market-agent](https://github.com/vidaudeveloper/market-agent)

**Hermes / Agent 一键安装：** 复制 [`INSTALL-PROMPT.md`](INSTALL-PROMPT.md) 里的英文提示词；斜杠技能见 [`HERMES.md`](HERMES.md)（`/vidau-market-agent`）。

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

### 2️⃣ 配置说明（多数用户无需填 Key）

> 详见 [`ENV_SETUP.md`](ENV_SETUP.md)

| 配置项 | 谁需要填 | 何时需要 |
|--------|----------|----------|
| **无**（用 Hermes/Agent 写报告） | 普通用户 | 直接对话即可，**不要填 AI_API_KEY** |
| 飞书 OAuth「同意」 | 各用户本机一次 | 首次导出飞书时浏览器授权 |
| `FEISHU_APP_ID` / `SECRET` | 管理员 | 已在仓库 `.env` 预配，用户不用填 |
| `AI_API_KEY` | 管理员（可选） | 仅 `ai-analyze.js` 或 `--charts-ai` 时需要 |
| `auth.json` | 各用户 | 仅查出海匠 TikTok 数据时 |

克隆仓库后若已有 `.env`，**跳过复制模板**，直接 `npm install` 即可。

```bash
git clone https://github.com/vidaudeveloper/market-agent.git
cd market-agent
npm install   # 或双击 setup.bat
```

### 3️⃣ 在 Cursor 中打开本文件夹

```
D:\AAA-agent\AI营销全案策划师
```

直接对话示例：

```
"帮我分析 https://xxx.com 的品牌定位"
"做一份未来三个月的市场策划并导出到飞书"
"查 TikTok 美区店铺销量前三"
```

---

## 📤 飞书导出（浏览器 OAuth，无需 Web 页面）

> **普通用户请看 [`FEISHU-USER-GUIDE.md`](FEISHU-USER-GUIDE.md)**（3 步上手，含「agent飞书认证」排障）

将 `output/` 中的 Markdown 报告导出到**当前用户自己的飞书云文档**。

**不要用 Hermes 内置「agent飞书认证」**；请用本仓库脚本。

### 用户第一次连接（推荐）

| 系统 | 操作 |
|------|------|
| **Windows** | 双击 **`feishu-connect.bat`** |
| **Mac / Linux** | `bash scripts/feishu-connect.sh` |

浏览器点「同意」后，再导出报告。

### 工具提供方配置（做一次，全员共用）

1. [飞书开放平台](https://open.feishu.cn/) 创建/使用应用  
2. **安全设置 → 重定向 URL** 添加：
   ```
   http://localhost:8787/api/auth/feishu/callback
   http://127.0.0.1:8787/api/auth/feishu/callback
   ```
3. 开通权限：`docx:document:create`、`drive:drive`、`docx:document.block:convert` 等  
4. 仓库 `.env` 已含飞书凭证；用户首次导出时浏览器 OAuth 即可

### 用户使用（每人本机授权一次）

**推荐：导出时自动授权**

```bash
cd D:\AAA-agent\AI营销全案策划师
node scripts/feishu-export.js output/你的报告.md "文档标题"
```

- 首次运行 → **自动打开浏览器** → 飞书页点「同意」  
- 凭证保存在本机 `auth/feishu-user.json`（勿提交 git）  
- 文档进入**授权账号自己的飞书**

**手动授权：**

```bash
node scripts/feishu-auth.js           # 连接飞书
node scripts/feishu-auth.js --status  # 查看状态
node scripts/feishu-auth.js --logout  # 断开
```

**npm 快捷命令：**

```bash
npm run feishu:auth
npm run feishu:export -- output/report.md "标题"
```

### 飞书常见问题

| 问题 | 处理 |
|------|------|
| 20029 重定向 URL 有误 | 检查飞书后台 8787 回调是否已添加并发布应用 |
| 8787 端口被占用 | 关闭其他授权窗口；脚本会自动尝试释放端口 |
| 文档进谁的飞书？ | OAuth 授权时登录的飞书账号 |
| 换电脑 | 新电脑需重新授权一次 |
| 出现「没有 access to agent飞书认证」 | **勿用 Hermes 内置飞书**；双击 `feishu-connect.bat` 重新授权，详见 `FEISHU-USER-GUIDE.md` |
| 每次新建文档？ | 是，当前每次导出创建新飞书文档 |
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
├── .env                   ← 飞书应用凭证（仓库已含）；AI Key 可选
├── .env.example           ← 配置模板
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
2. 仓库 `.env` 已含飞书应用凭证，**用户无需填 AI_API_KEY**  
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

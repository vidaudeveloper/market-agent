# Vidau Market MCP 用户指南

> 一次授权，全程对话。无需记命令行，无需手动登录出海匠后台抄 Cookie。

适用于 **Cursor**、**Hermes Agent**、Claude Desktop 等支持 MCP 的客户端。

---

## 0. 两套 MCP（先分清）

本仓库涉及**两个独立**的 MCP 服务，一键安装 `install-all.bat` / `install-all.sh` 会同时配置：

| MCP 名称 | 类型 | 作用 | 安装方式 |
|----------|------|------|----------|
| **vidau-market** | stdio（本仓库 `mcp-server/`） | Playwright 抓取、飞书导出、`chuhaijiang_pipeline` | `install-mcp.bat` |
| **chuhaijiang** | HTTP 开放平台 | `search`、`get_detail`、`account_info` 等实时 API | `node scripts/install-chuhaijiang-open-mcp.js` + `sk_live_` Key |

另有 **SkillHub 官方 chuhaijiang skill**（`node scripts/install-chuhaijiang-skillhub.js`），内含 `references/setup.md` 引导配 Key 与验证。

- **实时 API 查询** → 用 `chuhaijiang` HTTP MCP（需 API Key）
- **全案 pipeline、截图、飞书导出** → 用 `vidau-market` MCP（需浏览器登录出海匠时走 `auth_chuhaijiang_login`）

---

## 1. 安装（3 步）

```bash
git clone https://github.com/vidaudeveloper/market-agent.git
cd market-agent
```

**推荐一键安装：**

| 系统 | 命令 |
|------|------|
| Windows | 双击 `install-all.bat` |
| Mac/Linux | `bash install-all.sh` |

或分步：

```bash
npm install
npm run setup          # 安装 Playwright Chromium
node scripts/install-chuhaijiang-skillhub.js
node scripts/install-chuhaijiang-open-mcp.js --api-key sk_live_xxx   # 向 developer.chuhaijiang.com 申请
```

### 写入 MCP 配置

| 系统 | 命令 |
|------|------|
| Windows | 双击 `install-mcp.bat` |
| Mac/Linux | `bash install-mcp.sh` |

或手动参考 [`mcp.json.example`](mcp.json.example) 配置 `VIDAU_MARKET_ROOT` 指向仓库根目录。

---

## 2. 客户端启用

### Cursor

1. 用 Cursor **打开仓库根目录**（本文件夹）
2. `install-mcp.bat` 会生成 `.cursor/mcp.json`
3. 打开 **Settings → MCP**，确认 `vidau-market` 为绿色已连接
4. 若未出现，重启 Cursor

### Hermes Agent

```bash
# 将路径替换为你的仓库绝对路径
hermes mcp add vidau-market \
  --command node \
  --args /path/to/market-agent/mcp-server/index.js \
  --env VIDAU_MARKET_ROOT=/path/to/market-agent

/reload-mcp
```

同时安装斜杠技能：见 [`HERMES.md`](HERMES.md)（`/vidau-market-agent`）。

**工作区**必须指向本仓库根目录，Agent 才能读 `AGENT.md` 与 `skills/`。

---

## 3. 首次授权（对话触发）

在聊天中说：

```
帮我检查 Vidau MCP 授权状态
```

Agent 会调用 `auth_status`。若缺少项，按提示授权：

| 缺失项 | MCP 工具 | 用户操作 |
|--------|----------|----------|
| `feishu_env` | — | 确认仓库 `.env` 含 `FEISHU_APP_ID` / `FEISHU_APP_SECRET` |
| `feishu_oauth` | `auth_feishu_connect` | 浏览器点「同意授权」 |
| `chuhaijiang_login` | `auth_chuhaijiang_login` | 浏览器登录出海匠，完成后关闭 |
| `playwright_install` | — | 运行 `npm run setup` |

授权凭证保存在本机 `auth/`，**不会**通过 MCP 返回给模型。

---

## 4. 典型对话

### 出海匠竞品 + 飞书交付

```
查 beauty 类目 TikTok 竞品（达人+店铺+商品），导出飞书
```

Agent 流程：

1. `auth_status` → 缺则先授权
2. `chuhaijiang_pipeline`（keyword=beauty, export_feishu=true）
3. 返回报告路径 + `feishu.cn/docx/xxx` 链接

### 仅导出已有报告

```
把 output/出海匠链路测试-2026-07-09.md 导出飞书，标题「美妆竞品分析」
```

→ `feishu_export`

### 查看历史报告

→ `list_reports` / `read_report`

---

## 5. 可用 MCP 工具（P0）

| 工具 | 说明 |
|------|------|
| `auth_status` | 飞书/出海匠/环境诊断 |
| `auth_feishu_connect` | 飞书 OAuth |
| `auth_chuhaijiang_login` | 出海匠浏览器登录 |
| `chuhaijiang_pipeline` | 达人+店铺+商品+截图+报告 |
| `feishu_export` | Markdown → 飞书 |
| `list_reports` | 列出 output/ 报告 |
| `read_report` | 读取报告内容 |

### Resources（说明书）

| URI | 内容 |
|-----|------|
| `vidau://skills/index` | 全部 skill 列表 |
| `vidau://skills/{id}` | 单个 SKILL.md |
| `vidau://auth/status` | 连接状态 JSON |
| `vidau://config/pricing-logic` | 报价逻辑 |
| `vidau://config/agency-defaults` | Vidau 署名配置 |

---

## 6. 故障排查

| 现象 | 处理 |
|------|------|
| MCP 未出现在工具列表 | 检查 `.cursor/mcp.json` 路径；运行 `npm run mcp:smoke` |
| `chuhaijiang_pipeline` 超时 | 正常需 1–3 分钟；确保网络与出海匠登录有效 |
| 飞书 20029 | 见 `FEISHU-USER-GUIDE.md` 回调 URL |
| 中文路径问题 | 设置 `VIDAU_MARKET_ROOT` 为仓库绝对路径 |
| Hermes 工具不可见 | `/reload-mcp`；`hermes mcp list` 检查 |

---

## 7. 与 Skill 的关系

- **MCP**：执行脚本、查授权、返回飞书链接
- **Skill**（`skills/`）：告诉模型写什么、什么结构、报价逻辑

已配置 MCP 时，Agent **优先调 MCP 工具**，勿手写 `node scripts/...` shell。

详见 [`skills/vidau-market-agent/SKILL.md`](skills/vidau-market-agent/SKILL.md)。

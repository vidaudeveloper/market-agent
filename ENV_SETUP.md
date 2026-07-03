# 环境配置说明

> **Hermes / Vidau Agent 用户**：写报告、导出飞书、QuickChart 插图 **均不需要** 自己填 `AI_API_KEY`。  
> 飞书应用凭证已在仓库 `.env` 中预配；每人本机 OAuth 一次即可导出到自己的飞书。

---

## 功能与最少配置

| 功能 | 需要 `AI_API_KEY` | 需要飞书 `.env` | 需要本机 OAuth | 需要 `auth.json` |
|------|-------------------|-----------------|----------------|------------------|
| Agent 对话写报告 / TTS 全案 | **否** | 否 | 否 | 否 |
| 导出飞书（`feishu-export.js`） | **否** | 是（仓库已有） | 是（每人一次） | 否 |
| 飞书导出 + 图表（`--charts`，QuickChart） | **否** | 是 | 是 | 否 |
| `ai-analyze.js` 脚本分析 | **是** | 否 | 否 | 否 |
| `--charts-ai` 强制 AI 生图 | **是** | 否 | 否 | 否 |
| 出海匠 TikTok 数据 | 否 | 否 | 否 | 是（用户 Cookie） |

---

## 飞书（导出功能）

仓库 `.env` 已包含 `FEISHU_APP_ID` / `FEISHU_APP_SECRET`（团队共用应用）。

**用户只需：**

```bash
node scripts/feishu-export.js output/报告.md "标题" --charts
# 首次 → 浏览器点「同意」→ 凭证写入 auth/feishu-user.json
```

`auth/feishu-user.json` 不进 Git，每人每电脑各授权一次。

### 管理员维护飞书应用（一次性）

1. [open.feishu.cn](https://open.feishu.cn/) → 企业自建应用  
2. 重定向 URL：`http://localhost:8787/api/auth/feishu/callback` 与 `http://127.0.0.1:8787/api/auth/feishu/callback`  
3. 权限：`docx:document:create`、`drive:drive`、`docx:document.block:convert`、`docs:document.content:read` 等  
4. 发布应用；更新仓库 `.env` 中的 ID/Secret  

---

## AI API Key（可选）

**以下情况才需要**在 `.env` 填写 `AI_API_KEY`：

- 命令行运行 `node scripts/ai-analyze.js`
- 导出时使用 `--charts-ai` 强制 AI 生图
- QuickChart 失败且需自动回退 AI 生图（可在无 Key 时关闭回退）

**以下情况不需要：**

- Hermes / Cursor / Vidau Agent 对话生成报告（用 Agent 自带大模型）
- `feishu-export --charts` 默认 QuickChart 插图（`quickchart-js`，本地/在线渲染，不走 AI API）

```env
# 可选块（不用可留空或注释）
AI_API_KEY=
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
```

---

## 用户侧不需要自己申请

| 项目 | 说明 |
|------|------|
| 飞书 App ID/Secret | 仓库 `.env` 已预配 |
| AI API Key | 默认工作流不需要 |
| 飞书 OAuth | 首次导出浏览器授权 |
| `auth/feishu-user.json` | 授权后自动生成 |

---

## 安全提醒

- `.env` 含飞书 Secret，仓库若为 **Public** 请评估是否改为 Private  
- `auth/feishu-user.json` 勿提交 Git（已在 `.gitignore`）  
- Secret 泄露时在飞书开放平台轮换  

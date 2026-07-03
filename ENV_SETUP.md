# 环境配置说明

> **Hermes / Vidau Agent**：写报告、QuickChart 插图 **不需要** `AI_API_KEY`。  
> **导出飞书**：需在本机 `.env` 配置**你自己**的飞书自建应用（见 [`FEISHU-APP-SETUP.md`](FEISHU-APP-SETUP.md)），再浏览器 OAuth 一次。

---

## 功能与最少配置

| 功能 | 需要 `AI_API_KEY` | 需要飞书 `.env` | 需要本机 OAuth | 需要 `auth.json` |
|------|-------------------|-----------------|----------------|------------------|
| Agent 对话写报告 / TTS 全案 | **否** | 否 | 否 | 否 |
| 导出飞书（`feishu-export.js`） | **否** | **是（自填）** | 是（每人一次） | 否 |
| 飞书导出 + 图表（`--charts`） | **否** | **是（自填）** | 是 | 否 |
| `ai-analyze.js` | **是** | 否 | 否 | 否 |
| `--charts-ai` | **是** | 否 | 否 | 否 |
| 出海匠 TikTok 数据 | 否 | 否 | 否 | 是 |

---

## 首次安装

```bash
git clone https://github.com/vidaudeveloper/market-agent.git
cd market-agent
cp .env.example .env    # Windows: copy .env.example .env
npm install             # 或 setup.bat / setup.sh
```

---

## 飞书（导出功能）

1. 按 **[`FEISHU-APP-SETUP.md`](FEISHU-APP-SETUP.md)** 在飞书开放平台创建自建应用  
2. 将 `FEISHU_APP_ID`、`FEISHU_APP_SECRET` 写入本机 `.env`  
3. 运行 `feishu-connect.bat`（或 `bash scripts/feishu-connect.sh`）完成 OAuth  
4. 导出：`node scripts/feishu-export.js output/报告.md "标题" --charts`

用户指南：**[`FEISHU-USER-GUIDE.md`](FEISHU-USER-GUIDE.md)**

`auth/feishu-user.json` 为 OAuth 令牌，本机生成，不进 Git。

**勿用** Hermes 内置飞书插件；只用本仓库脚本 + 你自己配置的应用。

---

## AI API Key（可选）

仅 `ai-analyze.js`、`--charts-ai`、QuickChart 失败 AI 回退时需要。

```env
AI_API_KEY=
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
```

---

## 安全提醒

- **`.env` 勿提交 Git**（已在 `.gitignore`）  
- `auth/feishu-user.json` 勿提交  
- Secret 泄露时在飞书开放平台轮换并更新本机 `.env`

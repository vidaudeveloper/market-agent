# 环境配置说明

> **Hermes / Vidau Agent**：写报告、QuickChart 插图 **不需要** `AI_API_KEY`。  
> **导出飞书**：仓库 `.env` 已含**团队共用**飞书应用；每人本机 `feishu-connect.bat` OAuth 一次即可。

---

## 功能与最少配置

| 功能 | 需要 `AI_API_KEY` | 需要飞书 `.env` | 需要本机 OAuth | 需要 `auth.json` |
|------|-------------------|-----------------|----------------|------------------|
| Agent 对话写报告 / TTS 全案 | **否** | 否 | 否 | 否 |
| 导出飞书（`feishu-export.js`） | **否** | 是（仓库已有） | 是（每人一次） | 否 |
| 飞书导出 + 图表（`--charts`） | **否** | 是（仓库已有） | 是 | 否 |
| `ai-analyze.js` | **是** | 否 | 否 | 否 |
| `--charts-ai` | **是** | 否 | 否 | 否 |
| 出海匠 TikTok 数据 | 否 | 否 | 否 | 是 |

---

## 首次安装（内部同事）

```bash
git clone https://github.com/vidaudeveloper/market-agent.git
cd market-agent
npm install             # 或 setup.bat / setup.sh
# .env 已随仓库提供，无需自填飞书 App ID/Secret
feishu-connect.bat      # 每人本机浏览器授权一次
```

---

## 飞书（导出功能）

仓库 `.env` 已包含 `FEISHU_APP_ID` / `FEISHU_APP_SECRET`（位道科技内部共用应用）。

**同事只需：**

1. `git clone` 后直接使用仓库 `.env`（勿改 Secret 除非管理员轮换）
2. 运行 `feishu-connect.bat` 完成 OAuth
3. 导出：`node scripts/feishu-export.js output/报告.md "标题" --charts`

用户指南：**[`FEISHU-USER-GUIDE.md`](FEISHU-USER-GUIDE.md)**  
管理员维护应用：**[`FEISHU-APP-SETUP.md`](FEISHU-APP-SETUP.md)**（可用范围、权限、发布）

`auth/feishu-user.json` 为 OAuth 令牌，本机生成，不进 Git。

**勿用** Hermes 内置飞书插件。

---

## AI API Key（可选）

仅 `ai-analyze.js`、`--charts-ai`、QuickChart 失败 AI 回退时需要。

---

## 安全提醒

- 仓库为 **Private** 时 `.env` 可团队共用；若改为 Public 请移除 Secret  
- `auth/feishu-user.json` 勿提交  
- Secret 泄露时在飞书开放平台轮换并更新仓库 `.env`

# 环境配置说明

> **Hermes / Vidau Agent**：写报告、QuickChart 插图 **不需要** `AI_API_KEY`。  
> **导出飞书**：本机 `.env` 填入飞书应用凭证（向管理员索取）；每人 `feishu-connect.bat` OAuth 一次。

---

## 功能与最少配置

| 功能 | 需要 `AI_API_KEY` | 需要飞书 `.env` | 需要本机 OAuth | 需要 `auth.json` |
|------|-------------------|-----------------|----------------|------------------|
| Agent 对话写报告 / TTS 全案 | **否** | 否 | 否 | 否 |
| 导出飞书（`feishu-export.js`） | **否** | 是（本机 `.env`） | 是（每人一次） | 否 |
| 飞书导出 + 图表（`--charts`） | **否** | 是（本机 `.env`） | 是 | 否 |
| `ai-analyze.js` | **是** | 否 | 否 | 否 |
| `--charts-ai` | **是** | 否 | 否 | 否 |
| 出海匠 TikTok 数据 | 否 | 否 | 否 | 是 |

---

## 首次安装（内部同事）

```bash
git clone https://github.com/vidaudeveloper/market-agent.git
cd market-agent
npm install             # 或 setup.bat / setup.sh
cp .env.example .env    # Windows: copy .env.example .env
# 向团队管理员私聊索取 FEISHU_APP_ID / FEISHU_APP_SECRET，写入 .env
feishu-connect.bat      # 每人本机浏览器授权一次
```

完整步骤见 **[同事安装指南.md](同事安装指南.md)**。

---

## 飞书（导出功能）

**`.env` 不进 Git。** 同事从管理员处领取飞书应用凭证，写入本机 `.env`。

**同事只需：**

1. 复制 `.env.example` → `.env`，填入管理员提供的凭证
2. 运行 `feishu-connect.bat` 完成 OAuth
3. 导出：`node scripts/feishu-export.js output/报告.md "标题" --charts`

用户指南：**[`FEISHU-USER-GUIDE.md`](FEISHU-USER-GUIDE.md)**

`auth/feishu-user.json` 为 OAuth 令牌，本机生成，不进 Git。

**勿用** Hermes 内置飞书插件。

---

## AI API Key（可选）

仅 `ai-analyze.js`、`--charts-ai`、QuickChart 失败 AI 回退时需要。

---

## 安全提醒

- **`.env` 不进 Git**；同事通过管理员私聊领取凭证  
- 仓库建议保持 **Private**  
- `auth/`、`auth/feishu-user.json` 勿提交  
- Secret 若曾泄露，在飞书开放平台轮换后通知同事更新本机 `.env`

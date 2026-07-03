# 预配说明（管理员发给用户前必读）

> 用户**不需要**自己申请飞书应用或 API Key。  
> 由**管理员/工具提供方**在 `.env` 中预配好后，随文件夹一起分发（或通过内网共享 `.env`）。

---

## 必须预配（完整功能）

| 变量 | 用途 | 谁申请 | 说明 |
|------|------|--------|------|
| `AI_API_KEY` | Cursor 内 AI 分析、`ai-analyze.js` | 管理员 | DeepSeek / OpenAI / 中转 Token 等 |
| `AI_BASE_URL` | API 地址 | 管理员 | 如 `https://api.deepseek.com/v1` 或中转地址 |
| `AI_MODEL` | 模型名 | 管理员 | 如 `deepseek-chat`、`deepseek-v4-pro` |
| `FEISHU_APP_ID` | 飞书 OAuth | 管理员 | 飞书开放平台应用 ID |
| `FEISHU_APP_SECRET` | 飞书 OAuth | 管理员 | **勿发给终端用户，只写在 .env** |
| `FEISHU_REDIRECT_URI` | OAuth 回调 | 固定值 | `http://localhost:8787/api/auth/feishu/callback` |

---

## 可选预配

| 变量 | 用途 |
|------|------|
| `FEISHU_DEFAULT_FOLDER_TOKEN` | 导出文档默认存放的飞书文件夹 |
| `AI_TIMEOUT` | API 超时毫秒数，默认 60000 |
| `auth.json` | 出海匠 TikTok 数据（每用户自行登录抓取 Cookie） |

---

## 飞书开放平台（管理员做一次）

1. 登录 [open.feishu.cn](https://open.feishu.cn/) → 创建企业自建应用  
2. **凭证与基础信息** → 复制 App ID、App Secret 到 `.env`  
3. **安全设置 → 重定向 URL** 添加：
   ```
   http://localhost:8787/api/auth/feishu/callback
   http://127.0.0.1:8787/api/auth/feishu/callback
   ```
4. **权限管理** 开通：`docx:document:create`、`drive:drive`、`docx:document.block:convert` 等  
5. **创建版本并发布** 应用  

---

## 分发 `.env` 模板（复制为 `.env` 后填入）

```env
# === AI（必填）===
AI_API_KEY=在此填入
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
AI_TIMEOUT=60000

# === 飞书（导出功能必填）===
FEISHU_APP_ID=cli_在此填入
FEISHU_APP_SECRET=在此填入
FEISHU_REDIRECT_URI=http://localhost:8787/api/auth/feishu/callback
# FEISHU_DEFAULT_FOLDER_TOKEN=
```

---

## 用户侧不需要预配

| 项目 | 说明 |
|------|------|
| 飞书 App ID/Secret | 已在 `.env`，用户不可见 |
| AI API Key | 已在 `.env`，用户不可见 |
| 飞书 OAuth | 首次导出时浏览器点「同意」 |
| `auth/feishu-user.json` | 授权后自动生成在本机 |

---

## 安全提醒

- `.env` 已加入 `.gitignore`，**不要提交到 Git**  
- 分发给同事可用：加密压缩包 / 内网盘 / 统一运维下发  
- 若 Key 泄露，在对应平台立即轮换  

---

## 功能与配置对照

| 功能 | 最少需要 |
|------|----------|
| Cursor 对话 + skills 分析 | 仅 Cursor 自带模型即可；`ai-analyze.js` 需 `AI_API_KEY` |
| 出海匠 TikTok 数据 | `auth.json`（用户各自 Cookie） |
| 导出飞书 | `FEISHU_APP_ID` + `FEISHU_APP_SECRET` + 用户 OAuth |

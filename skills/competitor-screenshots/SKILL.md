---
name: competitor-screenshots
description: "竞品官网/店铺截图（含反爬）。触发词：官网截图、店铺截图、Amazon截图、挂Chrome登录态、反爬截图。优先用克隆日常 Chrome 配置复用登录态。"
---

# 竞品官网 / 店铺截图（反爬实操）

需要「每个竞品的官网截图 / Amazon 店铺页截图」时用本 skill。TTS 数据仍走出海匠；本 skill 只负责**视觉证据**。

## 成功方案（本机已验证，优先用这个）

日常 Chrome 的 `--remote-debugging-port` 在部分 Windows 环境**起不来**（进程有、9222 不监听）。不要死磕 CDP。

**已验证可用的方法：克隆日常 Chrome 配置 → Playwright 用克隆配置启动（带登录 Cookie）。**

```bash
# 1. 用户先完全退出 Chrome（任务管理器无 chrome.exe）
node scripts/chrome-profile-clone.js

# 2. 用克隆配置截图（有界面，方便过验证码）
node scripts/competitor-screenshots-stealth.js --all --headed --profile auth/chrome-user-clone

# 只要 Amazon / 只要官网
node scripts/competitor-screenshots-stealth.js --amazon --headed --profile auth/chrome-user-clone
node scripts/competitor-screenshots-stealth.js --official --headed --profile auth/chrome-user-clone
```

| 要点 | 说明 |
|------|------|
| 克隆目录 | `auth/chrome-user-clone`（在 `auth/` 下，已 gitignore，禁止提交） |
| 不改原配置 | 只读复制 `User Data/Default`（排除 Cache 等大目录） |
| 有界面 | `--headed`：验证码 / 地区弹窗可人工点 20 秒窗口内处理 |
| 断开方式 | 截完会关**克隆配置**开的窗口；用户日常 Chrome 需自行再开 |

### Agent 执行顺序

1. 提醒用户退出日常 Chrome（或代为 `Stop-Process chrome`，需用户知情）。
2. `node scripts/chrome-profile-clone.js`（若克隆已存在且登录仍有效可跳过）。
3. `node scripts/competitor-screenshots-stealth.js --amazon|--official|--all --headed --profile auth/chrome-user-clone`。
4. 读终端「成功 x/y」；用 Read 抽查 PNG，确认不是 403 / 狗页 / 滑块页。
5. 路径写入报告与 Project Facts `screenshots[]`（仓库相对 POSIX 路径）。
6. 导出飞书：本地 `![](assets/...)` **不能**靠 Markdown convert 显示。必须走 `feishu-export.js`（会自动把本地图换成标记并用 API 上传到正文对应位置）。不要只在文末手工插图却留正文里的破损图片块。

## CDP 挂已打开 Chrome（备选，本机常失败）

仅当 `http://127.0.0.1:9222/json/version` 能返回 JSON 时再用：

```bash
# 必须先完全退出 Chrome，再启动带调试端口的实例
node scripts/chrome-cdp-start.js --port 9222
# 或手工：
# chrome.exe --remote-debugging-port=9222

node scripts/competitor-screenshots-stealth.js --all --cdp 9222
```

CDP 模式只**断开连接**，不关用户 Chrome。若端口不起，立刻回退到「克隆配置」方案，不要反复重试 CDP。

## 独立空配置（不推荐做 Amazon）

```bash
node scripts/competitor-screenshots-stealth.js --all --headed
```

使用 `auth/browser-profile-screenshots`，无日常登录态；Amazon / 强反爬站容易 503 狗页。

## 预期与缺口

| 站点类型 | 经验 |
|----------|------|
| Nike / On / Puma 官网 | 克隆配置 + headed 通常可过 |
| Amazon 检索/店铺页 | 克隆配置可带登录；注意地区可能落在 `.sg`（价格勿当美区结论） |
| Adidas / New Balance / ASICS / HOKA | Akamai / 滑块强校验，常需 headed 下**人工过验证**后再截；自动化不能保证 |
| 出海匠商品深页 | 用 `auth/chuhaijiang-storage.json` 登录态；营销弹窗可能挡内容，数值以 MCP API 为准 |

截图判定为失败的特征：`Access Denied`、`I am not a Robot`、`Verification Required`、Amazon 狗页、`Sorry something went wrong`。

## 相关脚本

| 脚本 | 作用 |
|------|------|
| `scripts/chrome-profile-clone.js` | 克隆日常 Chrome 配置（成功方案） |
| `scripts/competitor-screenshots-stealth.js` | `--profile` / `--cdp` / `--amazon` / `--official` / `--headed` |
| `scripts/chrome-cdp-start.js` | 尝试启动 CDP（备选） |

## 与其它 skill 的关系

- 竞品分析主流程：`skills/market-competitors/SKILL.md`（数据走出海匠；截图按本 skill）
- 出海匠页面截图：`skills/chuhaijiang-data/SKILL.md`
- 飞书导出金额勿变公式：导出走 `scripts/markdown-feishu-sanitize.js`（表格内 `$` → `USD` / `万美元`）；本地图需另接口上传

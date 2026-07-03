# 飞书导出 — 普通用户指南

> 3 步完成。不需要申请 API Key，不需要懂代码。  
> 适用：Hermes / Vidau Agent / Cursor 用户

---

## 先记住一件事

**不要在 Hermes 里点「连接飞书」「agent飞书认证」等内置按钮。**

那是 Hermes 自己的飞书插件，多数同事没有权限，会出现：

> You don't have the access to **agent飞书认证**

正确做法：用本仓库自带的脚本，文档会进**你自己的飞书账号**。

---

## 第一次使用（3 步）

### 第 1 步：安装项目（若还没装）

| 系统 | 操作 |
|------|------|
| Windows | 双击 `setup.bat` |
| Mac / Linux | 终端执行 `bash setup.sh` |

### 第 2 步：连接你的飞书（每人每电脑做一次）

| 系统 | 操作 |
|------|------|
| **Windows** | 双击 **`feishu-connect.bat`** |
| **Mac / Linux** | 终端执行 `bash scripts/feishu-connect.sh` |

会自动打开浏览器 → 在飞书页面点 **「同意授权」** → 窗口显示「✅ 飞书授权成功」即可。

### 第 3 步：导出报告

**方式 A — 让 Agent 帮你导出（推荐）**

在 Hermes / Cursor 里说：

```
把 output 里最新的报告导出到我的飞书，标题用「品牌名 TTS增长全案」
```

Agent 应执行（你也可自己复制到终端）：

```bash
node scripts/feishu-export.js output/你的报告.md "文档标题" --charts
```

**方式 B — 自己运行命令**

在项目文件夹打开终端，执行：

```bash
node scripts/feishu-export.js output/你的报告.md "文档标题" --charts
```

成功标志：终端出现 `✅ 导出成功!` 和 `https://feishu.cn/docx/...` 链接。

---

## 日常检查：是否已连接？

```bash
node scripts/feishu-auth.js --status
```

| 结果 | 含义 |
|------|------|
| `✅ 已连接飞书` | 可以直接导出 |
| `❌ 未连接飞书` | 再运行一次 `feishu-connect.bat` |

---

## 常见问题

### 1. 出现「没有 agent飞书认证 / 使用权限」

分两种情况：

**A. 没用 `feishu-connect.bat`，在 Hermes 里点的飞书**  
→ 关闭页面，改用 `feishu-connect.bat`。

**B. 已用 `feishu-connect.bat`，登录的是位道科技账号（如张明静）仍无权限**  
→ **飞书管理员未开放应用可用范围**，用户自己解决不了。

请把 **`FEISHU-ADMIN.md`** 发给公司飞书管理员，并附上诊断结果：

```bash
node scripts/feishu-diagnose.js
```

管理员按文档把「可用范围」改为 **全部员工** 并 **发布应用** 后，你再运行 `feishu-connect.bat`。

**如何确认走的是本仓库应用？**  
浏览器地址栏应包含 `client_id=cli_…`（与诊断脚本打印的 App ID 一致）。若没有，说明仍走了 Hermes 内置飞书。

### 2. 点了同意还是失败 / 仍然无权限（旧条目合并见上）

**原因**：飞书管理员还没把你加进应用的「可用范围」。

**解决**：把 **`FEISHU-ADMIN.md`** 发给飞书管理员（比下面话术更完整）。简要话术：

```
请帮我在飞书开放平台打开「Vidau Market Agent / agent飞书认证」应用：
1. 应用发布 → 确认已发布
2. 可用范围 → 设为「全部员工」或把我（姓名/部门）加进去
3. 重定向 URL 已包含 http://localhost:8787/api/auth/feishu/callback
完成后我重新运行 feishu-connect.bat 即可。
```

管理员处理完后，你重新双击 `feishu-connect.bat`。

### 3. Agent 说连不上飞书 / 找不到授权

**解决**：在本机 PowerShell 或终端**手动**执行（不要等 Hermes 按钮）：

```bash
cd 你的market-agent文件夹路径
# Windows 直接双击 feishu-connect.bat
# Mac/Linux: bash scripts/feishu-connect.sh
```

Hermes 需满足：

- 工作区（workspace）= market-agent 仓库根目录  
- 终端模式 = **local**（本地执行，不是 Docker 沙箱）

### 4. 换电脑了

新电脑重新做一次 **第 2 步**（`feishu-connect.bat`）即可。

### 5. 想换飞书账号

```bash
node scripts/feishu-auth.js --logout
```

然后重新运行 `feishu-connect.bat`，用新账号登录授权。

### 6. 文档是谁的？能改吗？

- 文档在 **OAuth 时登录的那个飞书账号** 里  
- 导出后**可以编辑**（所有者是你本人，不是机器人）

---

## 你不需要做的事

| 不需要 | 说明 |
|--------|------|
| 填 `AI_API_KEY` | 写报告、导出飞书、插图都不需要 |
| 申请飞书应用 | 仓库 `.env` 已预配，管理员维护 |
| 粘贴 access_token | 脚本自动处理 |
| 用 Hermes 飞书插件 | 必须用 `feishu-export.js` |

---

## 快捷命令备忘

```bash
# 连接飞书（首次 / 重新授权）
feishu-connect.bat                    # Windows 双击
bash scripts/feishu-connect.sh        # Mac/Linux

# 查看状态 / 诊断
node scripts/feishu-auth.js --status
node scripts/feishu-diagnose.js

# 导出（带图表）
node scripts/feishu-export.js output/报告.md "标题" --charts

# 断开（换账号时用）
node scripts/feishu-auth.js --logout
```

npm 等价命令：

```bash
npm run feishu:connect
npm run feishu:export -- output/报告.md "标题" -- --charts
```

---

## 还是不行？

1. 确认已 `git pull` 到最新版  
2. 确认 `setup.bat` 已跑过（有 `node_modules`）  
3. 把 `node scripts/feishu-diagnose.js` 输出 + 无权限截图发给飞书管理员（见 `FEISHU-ADMIN.md`）
4. 附上 `node scripts/feishu-auth.js --status` 的输出

---
name: feishu-export
description: "飞书文档导出。触发词：导出飞书、飞书文档、导出到飞书、feishu export。将 output/ 中的 Markdown 报告导出到用户自己的飞书云文档，支持 Markdown 表格转原生表格。"
---

# 飞书文档导出 / Feishu Doc Export

> **普通用户 3 步指南：[`FEISHU-USER-GUIDE.md`](../../FEISHU-USER-GUIDE.md)**  
> 首次连接：Windows 双击 `feishu-connect.bat` / Mac·Linux `bash scripts/feishu-connect.sh`

## 触发方式

- "导出到飞书"
- "导出飞书文档"
- "把报告发到飞书"
- "feishu export"
- "生成飞书云文档"

## 能力说明

| 项目 | 说明 |
|------|------|
| 输入 | `output/*.md` Markdown 报告 |
| 输出 | 飞书云文档链接 `https://feishu.cn/docx/{document_id}` |
| 文档类型 | 飞书**云文档（docx）**，不是电子表格 |
| 表格 | Markdown 表格会转为飞书原生表格 |
| **排版** | 导出前自动去除 `$`（防飞书公式体）与正文数字加粗；撰写时即用「500 万美元」不用 `$` |
| **AI 图表** | 表格前加 `<!-- chart -->`，配合 `--charts` 用 `gpt-image-2` 生成 PNG 插入飞书 |
| 每次导出 | 创建**新文档**（非追加到已有文档） |
| 编辑权限 | 导出后自动转移文档所有权 / 授予可编辑权限 |
| **默认行为** | 报告写入 `output/` 后 Agent **自动导出**（见 `templates/config/delivery-defaults.json`）；用户说「不要飞书」则跳过 |

## Hermes 桌面端必读（避免文档不可编辑）

**禁止**使用 Hermes 内置飞书工具/插件（如「agent飞书认证」、Feishu MCP 等）导出本项目的 Markdown 报告。

| 导出方式 | 文档所有者 | 能否编辑 |
|----------|------------|----------|
| `node scripts/feishu-export.js`（本 skill） | 你的飞书账号 | ✅ 可编辑 |
| Hermes 内置「agent飞书认证」等 | 应用/机器人 | ❌ 通常只读 |

**必须**用 `terminal` 工具在本机项目根目录执行：

```bash
node scripts/feishu-auth.js --status
node scripts/feishu-export.js output/报告.md "标题"
```

成功标志：终端输出含 `✅ 导出成功!` 和 `https://feishu.cn/docx/...`；飞书文档所有者是你本人，不是应用名。

### Hermes 桌面端如何看终端输出

1. **对话里的工具卡片**：Agent 执行 `terminal` 时，聊天窗口会展开命令与 stdout（含 `导出成功` / `导出失败`）。
2. **右侧预览栏（Preview Rail）**：部分版本在聊天右侧显示工具输出与文件预览。
3. **内嵌终端面板**：若界面有 Terminal 侧栏，可直接看到 shell 输出；也可让 Agent 使用 `read_terminal` 读取当前终端内容。
4. **启动日志**（排查用）：在系统终端执行 `hermes logs gui -f`，或查看 `%LOCALAPPDATA%\hermes\logs\desktop.log`。
5. **最稳妥**：在 Windows PowerShell 里手动跑上述 `node scripts/...` 命令，输出一目了然。

### Hermes 终端后端须为 local

在 Hermes 配置中确认 `terminal.backend: local`（默认本地执行）。若为 docker/modal 等沙箱，无法读写本机 `auth/feishu-user.json`，也无法完成 OAuth。

## 前置条件

### 管理员已配置（`.env`，克隆仓库后通常已有）

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_REDIRECT_URI`（默认 `http://localhost:8787/api/auth/feishu/callback`）

**不需要**为常规导出配置 `AI_API_KEY`：`--charts` 默认用 **QuickChart**（无需 API Key）。

### 可选（仅特殊场景）

- `AI_API_KEY` + `AI_BASE_URL` — 仅 `--charts-ai`、QuickChart 失败回退、或 `ai-analyze.js`
- `AI_IMAGE_MODEL=gpt-image-2`（AI 生图时用）

### 飞书开放平台（管理员做一次）

重定向 URL 须包含：

```
http://localhost:8787/api/auth/feishu/callback
http://127.0.0.1:8787/api/auth/feishu/callback
```

权限示例：`docx:document:create`、`drive:drive`、`docx:document.block:convert` 等。

### 用户本机授权（每人每电脑一次）

- 凭证文件：`auth/feishu-user.json`（自动生成，勿提交 git）
- **不能跳过用户 OAuth**；文档必须进入授权账号自己的飞书
- 无 Web 设置页；授权通过本地脚本 + 浏览器完成

## Agent 执行流程（必须按顺序）

**在项目根目录 `D:\AAA-agent\AI营销全案策划师` 执行 shell 命令。**

### 1. 确认报告已保存

导出前确保目标 Markdown 已写入 `output/`，例如 `output/MARKETING-REPORT-2026-06-30.md`。

### 2. 检查飞书连接状态

```bash
node scripts/feishu-auth.js --status
```

| 结果 | 下一步 |
|------|--------|
| `✅ 已连接飞书` | 直接执行导出（步骤 4） |
| `❌ 未连接飞书` | 执行步骤 3 授权 |

### 3. 未连接时：发起 OAuth

**方式 A（推荐）**：导出时自动授权

```bash
node scripts/feishu-export.js output/报告文件.md "文档标题"
```

首次运行会自动：

1. 在本机 `127.0.0.1:8787` 启动回调服务
2. 打开系统浏览器到飞书授权页
3. 用户点击「同意」后写入 `auth/feishu-user.json` 并继续导出

**方式 B**：手动先授权

```bash
node scripts/feishu-auth.js
```

对未授权用户说：

> 正在打开飞书授权页，请在浏览器中点击「同意授权」。完成后我会自动继续导出。

### 4. 导出到飞书

**仅表格：**

```bash
node scripts/feishu-export.js output/报告文件.md "自定义文档标题"
```

**含 AI 图表（推荐有商业数据时）：**

```bash
node scripts/feishu-export.js output/报告文件.md "标题" --charts
```

或使用 npm：

```bash
npm run feishu:export -- output/报告文件.md "标题" -- --charts
```

已授权时对用户说：

> 正在导出到你的飞书…

### 5. 返回结果

脚本成功后会输出：

- 标题
- 分段数（长文档会自动按 ~6000 字分段）
- 链接：`https://feishu.cn/docx/xxx`

将**飞书链接**回复给用户。

## 辅助命令

| 命令 | 用途 |
|------|------|
| `node scripts/feishu-auth.js` | 手动连接 / 重新授权 |
| `node scripts/feishu-auth.js --status` | 查看是否已连接 |
| `node scripts/feishu-auth.js --logout` | 断开本机飞书连接 |
| `node scripts/feishu-export.js <文件> [标题] --no-auth` | 禁止自动弹授权（须先手动授权） |

## Markdown 表格要求

源文件使用标准 Markdown 表格语法即可导出为飞书表格：

```markdown
| 维度 | 得分 |
|------|------|
| SEO | 72/100 |

*数据来源：目标站 WebFetch 抓取，2026-06-30。*
```

含数字的数据块须遵守 `skills/DATA-SOURCE.md`，导出时**保留**来源标注行。

## 图表插图（QuickChart 优先，按需插入）

Mermaid 在飞书中**不会渲染**。在需要可视化的表格前加 `<!-- chart -->` 标记，导出时自动用 QuickChart 生成 PNG 并**插入到对应表格后**（非文末）。

### 1. 在表格前一行加标记

```markdown
## 社媒平台触达对比

<!-- chart:radar -->

| 维度 | TikTok | Instagram | YouTube |
|------|--------|-----------|---------|
| 曝光 | 90 | 75 | 60 |
| 互动率 | 85 | 80 | 70 |
```

| 标记 | 图表类型 |
|------|----------|
| `<!-- chart -->` | 自动推断 |
| `<!-- chart:bar -->` | 柱状图 |
| `<!-- chart:line -->` | 折线图 |
| `<!-- chart:radar -->` | 雷达图（竞品/市场/社媒等多维对比） |
| `<!-- chart:doughnut -->` | 环形图 |

完整示例：`templates/chart-markdown.example.md`。选图规则见 `skills/market-chart/SKILL.md`。

### 2. 单独生成图表 PNG

```bash
node scripts/chart-markdown.js output/报告.md
node scripts/chart-markdown.js output/报告.md --inject
node scripts/ai-chart.js output/报告.md          # 兼容入口，同上
```

### 3. 导出飞书时自动插图

```bash
node scripts/feishu-export.js output/报告.md "标题" --charts
node scripts/feishu-export.js output/报告.md "标题" --charts-ai   # 强制 AI 生图
```

- 默认 **QuickChart**（秒级，**无需 AI_API_KEY**）
- 仅 `--charts-ai` 或 QuickChart 失败且开启 AI 回退时才需要 `AI_API_KEY`
- PNG 保存在 `output/charts/`
- 图表插入到**对应表格下方**，表格保留

### 4. 向已有飞书文档补图

```bash
node scripts/feishu-insert-charts.js --doc <documentId> --markdown output/报告.md
```

## 限制与注意事项

| 限制 | 说明 |
|------|------|
| 单段块数上限 | 超过 1000 块会报错，需缩短表格或拆分报告 |
| 图表引擎 | **QuickChart 默认，无需 AI_API_KEY**；`--charts-ai` 或 AI 回退才需要 Key |
| 环境要求 | 须本机可运行 Node、可开浏览器、可监听 8787 端口 |
| 换电脑 | 新电脑需重新 `feishu-auth.js` 授权 |
| 文档归属 | 导出后自动转移给 OAuth 授权用户，默认可编辑 |

## 常见问题

| 问题 | 处理 |
|------|------|
| **无 access to agent飞书认证** | 用户误用 Hermes 内置飞书 → 引导 `feishu-connect.bat`，见 `FEISHU-USER-GUIDE.md` |
| 导出后无法编辑 | 升级脚本后重新 `feishu-auth.js --logout` 再授权；旧文档需手动转移所有者 |
| 20029 重定向 URL 有误 | 检查飞书开放平台回调 URL 是否已添加并发布应用 |
| 8787 端口被占用 | 关闭其他授权窗口；或 `netstat -ano \| findstr :8787` 后结束占用进程 |
| Agent 找不到授权入口 | 直接执行本 skill 中的 shell 命令，不要等待 UI 按钮 |
| 云端 Agent 无法授权 | 在本机终端手动运行 `node scripts/feishu-auth.js` 后再导出 |

## Agent 禁止事项

- **禁止**使用 Hermes 内置飞书插件（「agent飞书认证」等）代替 `scripts/feishu-export.js`
- **禁止**在对话中让用户粘贴 `FEISHU_APP_SECRET` 或 `access_token`
- **禁止**声称可以跳过用户 OAuth
- **禁止**删除报告中的数据来源标注后再导出

## 相关脚本

- `scripts/feishu-auth.js` — OAuth 授权
- `scripts/feishu-export.js` — Markdown → 飞书云文档（支持 `--charts`）
- `scripts/feishu-read-doc.js` — **飞书 docx/wiki → Markdown**（读取案例，见 `skills/feishu-read/SKILL.md`）
- `scripts/chart-markdown.js` — Markdown 标记 → 图表 PNG（QuickChart 优先）
- `scripts/feishu-insert-charts.js` — 已有飞书文档按需插图
- `scripts/chart-gen.js` — QuickChart 底层
- `scripts/ai-chart.js` — 兼容入口
- `scripts/feishu-lib.js` — 飞书共享库（Agent 一般不直接调用）

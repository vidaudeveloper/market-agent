# 飞书导出 — 普通用户指南

> 写报告不需要 Key；**导出飞书**需先配置你自己的飞书应用（一次性）。

---

## 流程总览

```
1. setup.bat 安装依赖
2. 按 FEISHU-APP-SETUP.md 创建应用 → 填入 .env
3. feishu-connect.bat 浏览器授权（每人每电脑一次）
4. 导出: node scripts/feishu-export.js output/报告.md "标题" --charts
```

**不要用 Hermes 内置飞书插件**；只用本仓库脚本 + 你自己 `.env` 里的应用。

---

## 第 1 步：安装

| 系统 | 操作 |
|------|------|
| Windows | 双击 `setup.bat` |
| Mac / Linux | `bash setup.sh` |

`setup` 会从 `.env.example` 生成 `.env`（若不存在）。

---

## 第 2 步：配置飞书应用（首次必做）

完整图文：**[`FEISHU-APP-SETUP.md`](FEISHU-APP-SETUP.md)**

摘要：

1. [open.feishu.cn](https://open.feishu.cn/app) 创建**企业自建应用**
2. 配置重定向 URL、权限、发布、可用范围（全部员工）
3. 把 `FEISHU_APP_ID` / `FEISHU_APP_SECRET` 写入本机 `.env`

检查是否填好：

```bash
node scripts/feishu-diagnose.js
```

---

## 第 3 步：连接飞书（每人每电脑一次）

| 系统 | 操作 |
|------|------|
| Windows | 双击 **`feishu-connect.bat`** |
| Mac / Linux | `bash scripts/feishu-connect.sh` |

浏览器点 **「同意授权」** → 终端 `✅ 飞书授权成功`。

---

## 第 4 步：导出报告

对 Agent 说：

```
把 output 里最新的报告导出到我的飞书
```

或手动：

```bash
node scripts/feishu-export.js output/你的报告.md "文档标题" --charts
```

成功：终端有 `✅ 导出成功!` 和 `https://feishu.cn/docx/...`。

---

## 常见问题

### 未配置 `.env` 就连接

诊断会提示 `❌ 未配置 FEISHU_APP_ID`。先完成 **第 2 步**。

### OAuth 页「没有使用权限」

- 应用**未发布**，或**可用范围**未包含你 → 按 `FEISHU-APP-SETUP.md` 第 4 步  
- 或误用 Hermes 内置飞书 → 改用 `feishu-connect.bat`  
- 授权页地址栏 `client_id` 应与你 `.env` 里 `FEISHU_APP_ID` 一致

### Agent 连不上飞书

在本机终端手动执行 `feishu-connect.bat`；Hermes workspace 须指向本仓库，且 `terminal.backend: local`。

### 换电脑 / 换飞书账号

- 换电脑：重新 `feishu-connect.bat`（`.env` 可拷贝）  
- 换账号：`node scripts/feishu-auth.js --logout` 后再连接

---

## 快捷命令

```bash
node scripts/feishu-diagnose.js          # 检查 .env + 连接状态
node scripts/feishu-auth.js --status
node scripts/feishu-export.js output/报告.md "标题" --charts
npm run feishu:connect
npm run feishu:export -- output/报告.md "标题" -- --charts
```

---

## 你不需要

| 不需要 | 说明 |
|--------|------|
| `AI_API_KEY` | 写报告、QuickChart 插图、飞书导出均不需要 |
| 提交 `.env` | 含 Secret，仅放本机 |
| Hermes 飞书插件 | 用本仓库 `feishu-export.js` |

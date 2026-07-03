---
name: feishu-read
description: "飞书文档读取。触发词：读取飞书、导入飞书案例、feishu read。用本机 OAuth 将飞书 docx/wiki 导出为 Markdown，供 Agent 分析案例模板。"
---

# 飞书文档读取 / Feishu Doc Import

## 为什么 WebFetch 读不了飞书？

浏览器里你已登录，但 Agent 的 WebFetch **不带你的 Cookie**。必须用本机 OAuth（`auth/feishu-user.json`）调用飞书 Open API。

## 触发方式

- "读取这个飞书文档"
- "把飞书案例导入 templates"
- "feishu read"

## 用法

```bash
# 单个 docx 链接
node scripts/feishu-read-doc.js --url "https://xxx.feishu.cn/docx/AbCdEf..."

# document_id
node scripts/feishu-read-doc.js --doc AbCdEf1234567890

# Wiki 链接（自动解析为 docx token）
node scripts/feishu-read-doc.js --url "https://xxx.feishu.cn/wiki/NodeToken..."

# 批量（见 templates/feishu-reference-urls.txt）
node scripts/feishu-read-doc.js --batch templates/feishu-reference-urls.txt

# 指定输出
node scripts/feishu-read-doc.js --url "..." --output templates/reference/custom.md
```

## 输出

- 默认目录：`templates/reference/*.md`
- 文件头含 Source URL、Document ID、Title、Fetched 日期
- 正文为飞书官方 Markdown 导出（含表格）

## 权限

应用需开通 **`docs:document.content:read`**（已在 OAuth scope 中）。

若报权限错误：

```bash
node scripts/feishu-auth.js --logout
node scripts/feishu-auth.js
```

## Agent 工作流

1. 用户提供飞书链接
2. 执行 `feishu-read-doc.js` 保存到 `templates/reference/`
3. 阅读 Markdown，提炼章节结构写入新 skill 模板
4. **禁止**用 WebFetch 直接抓 feishu.cn 链接

## 相关脚本

- `scripts/feishu-read-doc.js` — 读取入口
- `scripts/feishu-lib.js` — `readFeishuDocument()`
- `scripts/feishu-auth.js` — OAuth 授权

# 飞书应用配置（新用户必读）

导出报告到飞书前，需在你**自己的飞书企业**创建自建应用，并把凭证写入本机 `.env`。

> `.env` **不会**进 Git，每人/每团队用自己的应用。

---

## 第 1 步：创建自建应用

1. 打开 [飞书开放平台](https://open.feishu.cn/app)（用你公司的飞书管理员或开发者账号）
2. **创建企业自建应用**
3. 应用名称自定（如 `Market Agent 导出`）

---

## 第 2 步：安全设置 → 重定向 URL

添加以下两条（缺一不可）：

```
http://localhost:8787/api/auth/feishu/callback
http://127.0.0.1:8787/api/auth/feishu/callback
```

---

## 第 3 步：权限管理

至少开通以下**用户身份**权限，并提交审核：

| 权限 | 用途 |
|------|------|
| `docx:document:create` | 创建云文档 |
| `docx:document` | 写入文档 |
| `docx:document:readonly` | 读取文档 |
| `docx:document.block:convert` | Markdown 转飞书块 |
| `drive:drive` | 云空间 / 插图 |
| `docs:document.content:read` | 读取文档（读案例时） |
| `contact:user.base:readonly` | 识别授权用户 |

---

## 第 4 步：发布与可用范围

1. **版本管理与发布** → 创建版本 → **申请发布** → 在飞书管理后台审批
2. **可用范围** → 设为 **全部员工**（或包含需要使用本工具的成员）

未发布或可用范围不含你本人时，OAuth 会显示「没有使用权限」。

---

## 第 5 步：写入本机 `.env`

1. 复制模板：

```bash
cp .env.example .env
# Windows: copy .env.example .env
```

2. 在开放平台 **凭证与基础信息** 复制：

```env
FEISHU_APP_ID=cli_xxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
FEISHU_REDIRECT_URI=http://localhost:8787/api/auth/feishu/callback
```

3. **不要**把 `.env` 提交到 Git。

---

## 第 6 步：验证

```bash
node scripts/feishu-diagnose.js
feishu-connect.bat          # Windows 双击
# bash scripts/feishu-connect.sh
```

浏览器点「同意」后，终端应显示 `✅ 飞书授权成功`。

试导出：

```bash
node scripts/feishu-export.js output/测试.md "验收" --charts
```

---

## 常见问题

| 问题 | 处理 |
|------|------|
| 无使用权限 | 检查应用已发布 + 可用范围含你 |
| 20029 重定向 URL 有误 | 检查第 2 步两条 URL 已保存并随版本发布 |
| 用了 Hermes 内置飞书 | 关闭，只用 `feishu-connect.bat` + 你自己 `.env` 里的应用 |
| 换团队/换公司 | 用新企业重新建应用，更新 `.env` 后重新 OAuth |

---

## 相关文档

- 用户 3 步上手：[`FEISHU-USER-GUIDE.md`](FEISHU-USER-GUIDE.md)
- 环境总览：[`ENV_SETUP.md`](ENV_SETUP.md)

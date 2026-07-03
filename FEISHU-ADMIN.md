# 飞书管理员修复清单（必读）

> **症状**：同事在位道科技飞书里登录（如张明静），浏览器仍显示  
> **「你没有 agent飞书认证 的使用权限」**  
> → 不是用户操作问题，是**企业自建应用未对全员开放**。

普通用户无法自行解决，**飞书管理员按本文操作一次**，全员即可用 `feishu-connect.bat` 授权。

---

## 根因说明

| 情况 | 含义 |
|------|------|
| 用户用了 Hermes「连接飞书」 | 打开的是 Hermes 自带应用，与 Vidau 仓库无关 → 让用户改用 `feishu-connect.bat` |
| 用户用了 `feishu-connect.bat`，仍是位道科技账号无权限 | **本仓库 `.env` 里的企业自建应用**未发布 / 可用范围未含该员工 |

本仓库当前应用 ID（在 `.env` 的 `FEISHU_APP_ID`，诊断脚本会打印完整值）：

```bash
node scripts/feishu-diagnose.js
```

---

## 管理员操作（约 10 分钟）

使用**位道科技飞书管理员**账号登录：

### 1. 打开开放平台

[https://open.feishu.cn/app](https://open.feishu.cn/app)

找到应用（名称可能是 **Vidau Market Agent**、**agent飞书认证** 或创建时自定义名）。  
不确定时：在应用列表里对照 **App ID** = 仓库 `.env` 中的 `FEISHU_APP_ID`（`cli_` 开头）。

### 2. 安全设置 → 重定向 URL

必须包含（两条都要）：

```
http://localhost:8787/api/auth/feishu/callback
http://127.0.0.1:8787/api/auth/feishu/callback
```

保存。

### 3. 权限管理

至少开通以下**用户身份**权限（并提交审核通过）：

| 权限 | 用途 |
|------|------|
| `docx:document:create` | 创建云文档 |
| `docx:document` / `docx:document:readonly` | 读写文档 |
| `docx:document.block:convert` | Markdown 转飞书块 |
| `drive:drive` | 云空间 / 插图 |
| `docs:document.content:read` | 读取文档（可选，读案例用） |
| `contact:user.base:readonly` | 识别授权用户 |

### 4. 应用可用范围（最关键）

路径一般为：**应用发布** → **版本管理与发布** → 当前版本 → **可用范围**

或：**开发者后台** → **应用发布** → **可用范围**

设置为：

- **全部员工**（推荐），或  
- 明确加入 **需要使用 Market Agent 的部门/成员**（如运营、市场全员）

> 只添加创建者本人时，其他同事（张明静等）会 exactly 看到截图中的无权限页。

### 5. 发布应用

**版本管理与发布** → 创建版本 → 填写说明 → **申请发布** → 在**飞书管理后台**审批通过。

未发布或仅「开发版」时，非开发者名单内的用户无法 OAuth。

### 6. 飞书管理后台确认（如仍失败）

管理员登录 [飞书管理后台](https://www.feishu.cn/admin)：

1. **工作台** → **应用管理** → 确认该自建应用已安装到企业  
2. **安全** → **开放平台** → 确认允许成员授权自建应用（按公司策略）  
3. 如有「应用可用范围」二次配置，同样选 **全部员工**

### 7. 通知用户重试

让同事执行：

```bash
git pull
node scripts/feishu-diagnose.js
feishu-connect.bat          # Windows 双击
# 或 bash scripts/feishu-connect.sh
```

授权页应能点 **同意**，终端显示 `✅ 飞书授权成功`。

---

## 验收标准

| 检查项 | 预期 |
|--------|------|
| `feishu-diagnose.js` | 打印正确 `FEISHU_APP_ID`，本机 OAuth 可未连接 |
| 浏览器 OAuth 地址栏 | 含 `client_id=<仓库 App ID>` |
| 授权页 | 出现「同意授权」，不再显示无权限 |
| `feishu-auth.js --status` | `✅ 已连接飞书` + 用户名 |
| 试导出 | `node scripts/feishu-export.js output/测试.md "验收" --charts` 返回 docx 链接 |

---

## 外部客户（不在位道科技飞书）

企业自建应用**不能**给外部公司用。外部客户需：

1. 在自己租户创建飞书应用并按上文配置，或  
2. 仅使用 `output/*.md`，不导出飞书，或  
3. 由 Vidau 以 ISV/商店应用方式发布（需单独立项）

---

## 轮换密钥（Secret 泄露时）

1. 开放平台 → 应用 → 凭证 → 重置 App Secret  
2. 更新仓库 `.env` 的 `FEISHU_APP_SECRET`  
3. 通知全员 `git pull` 后重新 `feishu-connect.bat`

---

## 联系支持时请提供

让同事把以下信息发给管理员：

```bash
node scripts/feishu-diagnose.js > feishu-diagnose.txt
```

并附：

- 无权限页面截图（含登录账号名）  
- 是否使用 `feishu-connect.bat`（而非 Hermes 按钮）  
- 浏览器地址栏是否含正确 `client_id`

---
name: chuhaijiang-data
description: "出海匠 TikTok 电商数据查询。触发词：出海匠查询、TikTok店铺排行、TikTok商品搜索、美区TikTok数据。查询出海匠平台的 TikTok 店铺销量排行和商品搜索数据。"
---

# 出海匠 TikTok 电商数据查询 / Chuhaijiang Data Fetcher

## 触发方式
- "查一下 TikTok 美区店铺销量前三"
- "在出海匠搜索 XXX 商品"
- "TikTok 美妆类目哪个店卖得好"

## 前置条件

### 登录态（运行前必检）

```bash
node scripts/chuhaijiang-auth-check.js          # 检查 auth_session
node scripts/chuhaijiang-auth-check.js --probe  # 额外 headless 验证 workspace
```

| 结果 | 处理 |
|------|------|
| ✅ 通过 | 直接跑 pipeline / agent-ask |
| ❌ 失败 | `node scripts/chuhaijiang-fetch.js screenshot --login`（headed，**最稳**） |
| agent-ask 场景 | 或 `--headed --wait-login` 在弹出窗口登录后继续 |

> 仅以 `auth/chuhaijiang-storage.json` 内含**未过期** `auth_session` 为已登录；文件存在不等于已登录。

### 手工配置（备选）
用户需先在浏览器中登录 [chuhaijiang.com](https://www.chuhaijiang.com)，然后：

1. **获取 auth_session（HttpOnly Cookie）**
   - F12 → Application → Cookies → `chuhaijiang.com`
   - 找到 `auth_session` 行 → 双击 Value 复制

2. **获取 _l_KPLiPs（Local Storage Token）**
   - F12 → Application → Local Storage → `chuhaijiang.com`
   - 找到 `_l_KPLiPs` → 双击 Value 复制

3. **填入 `auth.json`**
   ```json
   {
     "cookies": {
       "auth_session": "粘贴这里",
       ...
     },
     "localStorage": {
       "_l_KPLiPs": "粘贴这里"
     }
   }
   ```

> `auth_session` 是会话级 cookie，浏览器关闭后失效。过期后需重新按上述步骤获取。

## 支持的能力

### 0. 全链路（达人 + 竞品店铺 + 截图 + 飞书）— 分析环节必用

**脚本命令：**
```bash
node scripts/chuhaijiang-pipeline-test.js --keyword "beauty"
node scripts/chuhaijiang-pipeline-test.js --keyword "beauty" --export-feishu
```

**输出：** 达人表（头像/出海匠+TikTok 链接/GMV/标签）、竞品店铺表、爆款商品、出海匠页面截图、可选飞书文档。

> **TTS 全案 / 合作方案 / 运营测算** 写分析章节前，**默认执行本链路或等价分步抓取**，截图与表格须写入报告并附数据来源。

### 1. 店铺销量排行（免费）

**脚本命令：**
```bash
node scripts/chuhaijiang-fetch.js shop-ranking       # 默认 TOP 3
node scripts/chuhaijiang-fetch.js shop-ranking --top 10  # TOP 10
```

**数据字段：** 排名、店铺名、公司、类目、评分、在售商品数、日销量、总销量、日销售额、总销售额

### 2. 商品搜索（免费）

**脚本命令：**
```bash
node scripts/chuhaijiang-fetch.js product-search "medicube PDRN"
```

**数据字段：** 商品名、店铺、近7天销量、总销量、近7天销售额、总销售额、关联达人

### 4. Agent 对话提问（社媒管家等）

向出海匠 `/app/chat` 自动提问并抓取回复，支持**续聊**。用于：**宣发全案、预算分配、达人 BD 名单**。

#### 4.1 达人名单查询流程（用户有获取达人需求时）

**步骤 1 — 整理前置条件**（读 `templates/intake-creator-agent.json`，缺项补问）：

| 必填 | 说明 |
|------|------|
| 品牌/产品/市场 | prompt 主体 |
| 平台范围 | TT / IG / YT / FB |
| 受众与垂类标签 | 筛选标准 |
| KOL 预算与金字塔 | 层级、报价区间 |
| 输出表格字段 | @handle、互动率、BD 邮箱等 |
| upstream_plan_summary | 有上游方案时填入，便于续聊 |

**步骤 2 — 生成 prompt 文件**：`output/{project}-creator-prompt.txt`（可参考 `templates/prompt-creator-list.template.txt`）

**步骤 3 — 发起对话**：

```bash
# 新会话（策略全案）
node scripts/chuhaijiang-agent-ask.js --file output/{project}-prompt.txt --timeout 900 --headed --wait-login

# 续聊（达人名单，推荐在同一会话追问）
node scripts/chuhaijiang-agent-ask.js --file output/{project}-creator-prompt.txt --session {session_key} --out-suffix 达人名单 --timeout 900 --headed
```

**步骤 4 — 并入总报告 + 飞书**：摘要写入主报告「达人推荐」章；全文见 `output/出海匠Agent回复-*.md`；**默认** `feishu-export --charts` 一并导出。

**触发条件**（`delivery-defaults.json` → `creator_agent.auto_trigger_when`）：用户要名单 / 方案含 KOL 预算无 @handle / Package 含量化达人交付。

#### 4.2 命令速查

**首次提问：**
```bash
node scripts/chuhaijiang-agent-ask.js --file output/ktc-prompt.txt --timeout 900 --headed --wait-login
```

**续聊（同一会话追问）：**
```bash
node scripts/chuhaijiang-agent-ask.js --file output/ktc-followup-creators-prompt.txt --session ktc_gumi_launch --out-suffix KTC达人名单 --timeout 900 --headed
```

**会话索引：** `output/chuhaijiang-agent-sessions.json`（记录 `chatUrl`、回复文件路径）

| 项目 | KTC 闺蜜机案例 |
|------|----------------|
| 会话 key | `ktc_gumi_launch` |
| 对话链接 | https://www.chuhaijiang.com/app/chat/12d7ba7b-529a-4466-b35c-e5a63d574c4a |
| 首轮回复 | `output/出海匠Agent回复-2026-07-10.md` |
| 登录态 | `auth/chuhaijiang-storage.json` |

> 首次需 `--headed --wait-login` 在弹出浏览器完成登录；续聊可复用已保存登录态。

---

免费账号有每日/每月查询次数限制。额度耗尽后无法查看商品详情中的"核心数据"。

## 免费 vs 付费

| 功能 | 免费版 | 付费版 |
|------|--------|--------|
| 店铺销量排行 | ✅ 可查看 | ✅ 无限 |
| 商品搜索 | ✅ 可查看列表 | ✅ 无限 + 筛选 |
| 商品详情核心数据 | ❌ 有次数限制 | ✅ 无限 |

> 如果自己的免费额度用完，可以借同事/朋友的付费账号 auth 信息来查询。auth 信息与浏览器无关，任何设备都可用。

---

## 执行流程（AI 自动执行）

1. 检查 `auth/chuhaijiang-storage.json` 或 `auth.json` 是否存在且有效
2. 如未配置或过期 → 引导：`node scripts/chuhaijiang-fetch.js screenshot --login`
3. **客户全案类** → 双轨（见 `skills/WORKFLOW-CLIENT-ANALYSIS.md`）：
   - 轨道 A：Agent 自分析
   - 轨道 B1：`chuhaijiang-pipeline-test.js`（结构化达人/店铺/商品）
   - 轨道 B2：`chuhaijiang-agent-ask.js`（策略对话；达人需求时续聊名单）
4. **仅结构化数据** → pipeline 或 fetch 分命令
5. **仅达人名单** → 先 `intake-creator-agent.json` → agent-ask
6. 合并结论写入报告 + **默认飞书导出**

## 数据来源标注（必填）

须遵守 `skills/DATA-SOURCE.md`：出海匠表格数据须标注抓取时间与平台；若字段缺失或额度受限须说明。

## 输出

格式化表格写入对话或 `output/CHUHAIJIANG-DATA-[date].md`，含数据来源脚注与汇总章节。

---

## TTS 全案报告必填字段（写 growth / partnership / operation 前对照）

从出海匠或 Kalodata 抓取后，**尽量填满**下表；缺失须在报告中说明「无平台数据，基于公开信息推断」。

### 店铺维度

| 字段 | 用途 |
|------|------|
| 店铺名 / 链接 | 对标、引用 |
| 近 30/90 天 GMV 或销量 | 运营测算、相对位置 |
| 渠道占比：达人 / 商品卡 / 自营 / 商城 | doughnut 图、诊断 |
| 达人数量、头部达人 GMV 占比 | 竞品启示、Package |
| 内容条数、爆款视频类型 | 打品建议 |
| 客单价 ASP | 目标反推、财务测算 |

### 商品 / 类目维度

| 字段 | 用途 |
|------|------|
| 类目 Top 5–9 店铺名 + GMV 量级 | 行业对标表 |
| 竞品店铺 ≥2 家（各渠道结构） | 竞品章节 + radar |
| 关键词 / 类目排名 | 选品、广告 |

### 达人维度（pipeline 抓取）

| 字段 | 用途 |
|------|------|
| 头像 / 昵称 / @handle | 达人筛选、飞书交付 |
| 出海匠链接 + TikTok 链接 | 对标、Package |
| GMV / 标签 / 粉丝 | 报价倒推、BD 工作量 |

### 飞书交付：达人表头像与链接（**必遵守，2026-07-13 起**）

含达人/店铺头像、出海匠链接、TikTok 链接的表格导出飞书时，**禁止**在 Markdown 单元格里写外链或 `![](url)` / `[文字](url)`，否则会出现：头像上传失败、链接跳转飞书文档内链、表头色块怪异、表格被分段截断。

#### 头像

| 规则 | 说明 |
|------|------|
| Markdown 占位 | 头像列写 `·`，不写图片 URL |
| 本地下载 | `downloadEntityImagesWithFallback()`：OSS 过期 → `unavatar.io/tiktok/{handle}` → Playwright 兜底 |
| 上传飞书 | 导出时 `tableEmbeds` + `embedImagesInTableColumn` 写入表格列 |
| 校验 | 拒绝 SVG/logo（`isValidImageBuffer`），避免 chj-logo 当 jpg 上传 |

#### 链接（出海匠 + TikTok）

| 规则 | 说明 |
|------|------|
| Markdown 占位 | 链接列写 `链接` / `@handle`，**不写裸 URL** |
| 导出后修复 | `linkPatches` → `patchTableColumnHyperlinks` API 写入 `text_element_style.link` |
| 出海匠详情直链 | `https://www.chuhaijiang.com/app/discover/tiktok/creators/{creatorId}?country=TH` |
| creatorId 来源 | MCP `search`/`get_detail` 返回的 `id`，或头像路径 `ttm_user/u-{id}` |
| **禁止** | `?keyword=@handle` 搜索页（常无结果）；`country=th` 小写；表格内 `[链接](url)` |
| TikTok | `https://www.tiktok.com/@{handle}` |

#### 表头与其它

- 表头：**仅加粗**，不加浅蓝底（飞书 API 只能给文字铺色）
- 长表格：用 `splitMarkdownChunksSafe` 避免表格行被 chunk 截断
- 参考脚本：`scripts/build-anta-feishu-test.js`、`scripts/chuhaijiang-pipeline-test.js --export-feishu`
- 详见：`skills/feishu-export/SKILL.md` →「含头像/外链的表格」

```bash
# 带达人头像 + 双链接的标准导出
node scripts/build-anta-feishu-test.js --export-feishu
node scripts/chuhaijiang-pipeline-test.js --keyword "sports" --export-feishu
node scripts/feishu-export.js output/报告.md "标题" --embeds-json output/xxx-embeds.json --charts
```

`embeds-json` 示例结构：

```json
{
  "tableEmbeds": [{ "tableIndex": 1, "columnIndex": 1, "imagePaths": ["...local.jpg"] }],
  "linkPatches": [
    { "tableIndex": 1, "columnIndex": 9, "links": [{ "url": "https://www.chuhaijiang.com/.../creators/{id}?country=TH", "label": "出海匠" }] },
    { "tableIndex": 1, "columnIndex": 10, "links": [{ "url": "https://www.tiktok.com/@handle", "label": "@handle" }] }
  ]
}
```

> `tableIndex` 按文档内**表格出现顺序**从 0 计数，导出前须核对。

### 抓取命令示例

```bash
node scripts/chuhaijiang-pipeline-test.js --keyword "品类" --export-feishu
node scripts/chuhaijiang-fetch.js shop-ranking --top 10
node scripts/chuhaijiang-fetch.js product-search "品牌或品类"
```

字段映射到模板见 `templates/intake-tts.json` 与 `skills/tts-full-case/SKILL.md`。

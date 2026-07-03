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

### 需要认证信息
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

### 3. 商品详情核心数据（需付费账号）

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

1. 检查 `auth.json` 是否存在且已填写
2. 如未配置或过期 → 引导用户按上述步骤获取
3. 已配置 → 用 Playwright 打开浏览器 → 注入认证 → 导航到目标页面 → 抓取表格数据
4. 格式化输出为易读的表格
5. **每个数据表格下方**追加来源行，例如：`*数据来源：出海匠 chuhaijiang.com，scripts/chuhaijiang-fetch.js 抓取于 [date]*`
6. 末尾附 `## 数据来源汇总`

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

### 抓取命令示例

```bash
node scripts/chuhaijiang-fetch.js shop-ranking "类目关键词"
node scripts/chuhaijiang-fetch.js product-search "品牌或品类"
node scripts/chuhaijiang-fetch.js product-detail "商品URL"
```

字段映射到模板见 `templates/intake-tts.json` 与 `skills/tts-full-case/SKILL.md`。

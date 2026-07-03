---
name: market-chart
description: "数据图表生成（非AI）。触发词：生成图表、画图、柱状图、雷达图、按需插图、<!-- chart -->。基于 QuickChart，支持 Markdown 标记驱动、多场景雷达图、飞书表格后插入。"
---

# 数据图表生成 / Market Chart Generator

## 触发方式

- "生成图表" / "画一个柱状图" / "按需插图"
- "生成雷达图"（不限竞品，可用于目标市场、社媒触达等）
- Markdown 表格前加 `<!-- chart:radar -->`
- "market chart"

## 核心理念

**图表类型 ≠ 分析主题。** `radar` / `bar` / `line` 等只是呈现形式；分析什么由 **标题、维度 labels、数据** 决定。

| 层级 | 是否固定用途 | 说明 |
|------|-------------|------|
| `chart-gen.js` 引擎 | 否 | 通用参数：`type`、`title`、`labels`、`data`、`multi` |
| `competitor-radar` 等预设 | 否 | 仅提供默认维度名，可完全覆盖 |
| `<!-- chart -->` 标记 | 否 | Agent 写报告时在**需要可视化处**加标记 |
| `feishu-insert-charts.js --config` | 可选 | 手动指定 blockId 时用 JSON 覆盖 |

## Agent 选图规则（写报告时必须遵守）

| 数据特征 | 推荐图型 | Markdown 标记 |
|----------|----------|---------------|
| 占比 / 预算分配 / 份额 | 环形图 | `<!-- chart:doughnut -->` |
| 时间阶段 / KPI 趋势 | 折线图 | `<!-- chart:line -->` |
| 单系列数值对比 | 柱状图 | `<!-- chart:bar -->` |
| 多维度、多对象综合对比 | 雷达图 | `<!-- chart:radar -->` |
| 不确定 | 自动推断 | `<!-- chart -->` |

**雷达图典型场景（非仅限竞品）：**

- 竞品能力：品牌认知 / 设计 / 社媒 / Amazon / 价格 / 口碑
- 目标市场：购买力 / 增长 / 竞争强度 / 渠道成熟度 / 合规
- 社媒触达：曝光 / 互动率 / 转化 / 内容成本 / KOL 配合度
- 人群画像：价格敏感 / 颜值 / 功能 / 复购 / 传播力

## 按需插图工作流（推荐）

### 1. 写 Markdown 时在表格前加标记

```markdown
## 社媒平台触达对比

<!-- chart:radar -->

| 维度 | TikTok | Instagram | YouTube |
|------|--------|-----------|---------|
| 曝光 | 90 | 75 | 60 |
| 互动率 | 85 | 80 | 70 |
```

完整示例见 `templates/chart-markdown.example.md`。

### 2. 标记说明

| 标记 | 图表类型 |
|------|----------|
| `<!-- chart -->` | 自动推断（多列多行→雷达，占比→环形，时间→折线，默认柱状） |
| `<!-- chart:bar -->` | 柱状图 |
| `<!-- chart:line -->` | 折线图 |
| `<!-- chart:radar -->` | 雷达图 |
| `<!-- chart:pie -->` / `doughnut` | 环形图 |

### 3. 生成 PNG（QuickChart 优先，AI 备选）

```bash
node scripts/chart-markdown.js output/报告.md
node scripts/chart-markdown.js output/报告.md --inject    # 写回 Markdown 图片引用
node scripts/chart-markdown.js output/报告.md --ai-only   # 强制 AI
```

### 4. 导出飞书时自动插图（插入到对应表格后，非文末）

```bash
node scripts/feishu-export.js output/报告.md "标题" --charts
node scripts/feishu-export.js output/报告.md "标题" --charts-ai   # 强制 AI
```

### 5. 向已有飞书文档插图

```bash
# Markdown 驱动：按标记顺序匹配文档中第 N 个表格
node scripts/feishu-insert-charts.js --doc <documentId> --markdown output/报告.md

# JSON 配置（需精确 blockId 时用）
node scripts/feishu-insert-charts.js --doc <documentId> --config templates/charts.example.json

# 仅生成 PNG
node scripts/feishu-insert-charts.js --markdown output/报告.md --generate-only

# 替换已有图片块（config 中填 imageBlockId）
node scripts/feishu-insert-charts.js --doc <documentId> --config charts.json --refresh
```

## 手动 CLI（不依赖 Markdown）

```bash
node scripts/chart-gen.js --type radar --title "社媒触达" --labels "曝光,互动,转化" --multi "TikTok:90,85,70" "Instagram:75,80,65"
node scripts/chart-gen.js --preset channel-bar --data "1050,1380,720,580" --title "Q2渠道GMV"
```

## 预设模板（快捷默认值，非用途锁定）

| 预设名 | 类型 | 默认维度 |
|--------|------|----------|
| `competitor-radar` | radar | SEO/内容/社媒/广告/品牌/转化 |
| `channel-bar` | bar | 抖音/天猫/亚马逊/独立站 |
| `funnel-bar` | bar(横向) | 访客/注册/下单/复购 |
| `seo-line` | line | 1月-6月 |
| `share-pie` | doughnut | 渠道占比 |

## 表格数据格式

**单系列（柱状/折线/环形）：** 第一列标签，第二列数值

**多系列（雷达/多线/分组柱）：** 第一列维度，后续每列一个系列

## 飞书插图尺寸

| 类型 | PNG 尺寸 | 说明 |
|------|----------|------|
| radar | 680×680 | 正方形，避免变形 |
| bar | 680×360 | 紧凑 |
| line | 680×340 | 紧凑 |
| doughnut | 680×400 | 图例在右侧 |

上传时同时设置 width + height（等比缩放）。

## 注意事项

| 事项 | 说明 |
|------|------|
| 引擎 | QuickChart 默认；失败可 `--fallback-ai` 或 export 时自动回退 |
| 依赖 | `quickchart-js`；AI 备选需 `AI_API_KEY` |
| 标记位置 | 必须在表格**紧上方**（中间可空一行） |
| 数据来源 | 图表须基于报告表格真实数据，禁止编造 |
| 量级差异 | 折线图多列数值差 **≥15 倍**（如 GMV vs 订单）时自动 **双 Y 轴 + 柱+线组合**（左柱右线，避免两线重合）；`合计/总计` 行自动排除 |
| 飞书排版 | 导出前 `markdown-feishu-sanitize.js` 去除 `$` 与数字加粗，避免公式体 |
| 环/饼图 | **只用占比列**；勿把「18–34 岁」等特征列当数值；多 dataset 会变成内外双圈 |

## TTS 全案常用图表位置

| 文档类型 | 推荐标记 | 数据表 |
|----------|----------|--------|
| tts-growth-plan | radar / line / bar | 竞品维度表、GMV 爬坡表、预算表 |
| tts-partnership-proposal | doughnut / radar | 人群占比、竞品能力 |
| tts-operation-model | doughnut / line / bar | 渠道占比、30 天趋势、月预算 |
| amazon-agency-plan | doughnut / radar / line | 人群、竞品、销量预测 |

导出：`node scripts/feishu-export.js output/xxx.md "标题" --charts`

## 相关脚本

- `scripts/chart-markdown.js` — **Markdown 标记驱动**（主入口）
- `scripts/chart-gen.js` — QuickChart 底层生成器
- `scripts/feishu-insert-charts.js` — 已有飞书文档按需插图
- `scripts/feishu-export.js` — 导出 + `--charts` 自动插图
- `scripts/ai-chart.js` — 兼容入口（转发 chart-markdown）
- `templates/chart-markdown.example.md` — Markdown 示例
- `templates/charts.example.json` — JSON 配置示例

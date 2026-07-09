# 交付标准（TTS / Amazon 全案）

> 所有 TikTok Shop、Amazon 代运营、合作提案类报告**必须**遵守。与 `skills/DATA-SOURCE.md` 并列执行。

---

## 0. 服务商署名（强制）

- **所有对外交付文档**（合作方案、测算、增长全案、Amazon 代运营）的服务商/代运营方署名必须为 **Vidau**。
- 读取 `templates/config/agency-defaults.json`；禁止出现 Yatop、雅拓等第三方服务商名称。
- `templates/reference/*Yatop*` 等文件**仅作结构与深度参考**，复制章节时须替换为 Vidau 体系与 Vidau 案例链接。

---

## 1. 文档类型与对应 Skill

| 交付类型 | Skill | 参考案例 |
|----------|-------|----------|
| TTS 合作提案 / 代运营报价 | `tts-partnership-proposal` + `tts-pricing-logic` | NARRAK 合作方案 |
| TikTok 运营测算 / 诊断 | `tts-operation-model` | `templates/reference/V3-Vanson-汽车检测仪器美区-TikTok-运营测算.md` |
| 市场分析 + 选品 + 打品 + 节点 | `tts-growth-plan` | 出海匠 NARRAK 题 + `紫晶海外社媒调研-2026.md` 结论块 |
| Amazon 代运营 | `amazon-agency-plan` | `output/B0DCVSB4WX-NARRAK-Amazon分析与代运营方案.md` |
| 编排（多文档） | `tts-full-case` | 以上组合 |

---

## 2. 结构与深度（通用）

### 2.1 开篇

- **全案 / 调研**：文档最前必须有 **❗【核心结论】** 3–6 条，每条含「结论」+「论证闭环」
- **合作提案**：客户称呼 + 定制说明（尊敬的 XX 品牌方…）
- **测算 / 代运营**：**执行摘要** 表格（90 天目标 KPI）

#### ❗【核心结论】排版规范（飞书/Markdown 通用）

**禁止：** 每条结论写成一整段加粗长文 + 单行 bullet「论证闭环」，堆在一起难以扫读。

**必须按以下结构**（见 `templates/tts-growth-plan.template.md`）：

```markdown
## ❗【核心结论】

> 以下 N 条为决策摘要…

---

### 结论 1｜短标题（≤20 字，可扫读）

**结论**

1–2 句话，说清判断。

**论证闭环**

数据、对比、数字依据（可 2–4 句）。

---

### 结论 2｜短标题

…（每条之间用 --- 分隔）
```

| 元素 | 要求 |
|------|------|
| 短标题 | `### 结论 N｜…`，一眼看懂 |
| 结论段 | 独立段落，**结论** 小标题 + 空行 + 正文 |
| 论证段 | 独立段落，**论证闭环** 小标题 + 空行 + 正文 |
| 分隔 | 每条之间 `---` |
| 阅读指引 | 标题下用 `>` blockquote 说明条数 |
| 金额写法 | **禁用 `$` 符号**（飞书会渲染成公式体）；写「500 万美元」「USD 200」 |
| 数字强调 | 正文数字/百分比**不加粗**；强调放表格或小标题 |

### 2.2 编号

- 一级：`## 一、…` / `## 二、…`
- 二级：`### 1.1 …`
- 禁止跳级、禁止只有 bullet 无表格的核心数据章

### 2.3 数据密度（TikTok 类必填项）

写报告前尽量补齐；缺数据须写「*基于 … 估算/预估*」：

| 字段 | 说明 |
|------|------|
| 近 30 天 / 90 天销量、销售额 | 店铺或 SKU |
| 渠道占比 | 达人 / 商品卡 / 自营 / 商城 % |
| 销售方式占比 | 视频 / 直播 / 商品卡 % |
| 达人规模 | 关联达人数、近 30 天活跃数、出单率 |
| 内容规模 | 视频数、直播场次、爆款播放/销量 |
| 产品结构 | SKU 数、爆款占比 |
| 竞品 | 至少 2 家，每家含「对 XX 的启示」 |

### 2.4 诊断（测算 / 全案）

- 分级：**致命 / 严重 / 一般**
- 每条含：问题描述 → 影响程度（⚠️ 1–5）→ 诊断结论
- 行业对标须含 **倍数差距**（如「达人数量差 7667 倍」）

### 2.5 方案 Package 与报价（合作提案）

- 90 天交付须**量化**：BGC 条数、达人视频条数、直播小时
- **报价须按 `skills/tts-pricing-logic/SKILL.md`**：GMV 目标 → 视频量 → 四岗位人手 → 月费/季度费（禁止只写固定三档无推导）
- 报价三级：基础 / 标准（推荐）/ 旗舰（可与 `agency-defaults.json` 标签对照）
- 区分：服务费 vs 广告 spend vs Coupon 补贴
- **分析章节须含出海匠数据表 + 截图证据**（`chuhaijiang-pipeline-test` 或等价抓取）

### 2.6 图表（`market-chart`）

| 章节 | 推荐标记 |
|------|----------|
| 人群 / 渠道占比 | `<!-- chart:doughnut -->` |
| 竞品多维对比 | `<!-- chart:radar -->` |
| 预算 / 渠道 GMV | `<!-- chart:bar -->` |
| GMV / 销量爬坡 | `<!-- chart:line -->` |

全案至少 **2 处** chart 标记；导出飞书用 `--charts`。

---

## 3. 数据来源

- 每个含数字的数据块下方一行 `*数据来源：…*`
- 报告末尾 `## 数据来源汇总`
- 禁止无来源的精确数字

### 2.7 飞书导出（默认开启）

读取 `templates/config/delivery-defaults.json`：

| 配置 | 默认值 | 说明 |
|------|--------|------|
| `export.feishu` | **true** | 报告落盘 `output/` 后自动导出飞书 |
| `export.charts` | **true** | 有 `<!-- chart -->` 时加 `--charts` |
| `export.auto_after_report` | **true** | TTS/Amazon 全案完成后自动执行，无需用户再说「导出飞书」 |
| `export.skip_flag` | `--no-feishu` | 用户明确不要飞书时使用 |

命令：`node scripts/feishu-export.js output/xxx.md "标题" --charts`

---

## 4. 导出前自检（Agent 必做）

- [ ] 文档类型与 skill 匹配
- [ ] 有核心结论或执行摘要
- [ ] 含 30/90 天或渠道结构（或已标注估算）
- [ ] 竞品 ≥2 且有「启示」或对标表
- [ ] 有时间计划（月/周）
- [ ] 合作案含 Package 交付数量 + **报价倒推过程**（tts-pricing-logic）
- [ ] TTS 分析含出海匠数据表与截图证据章节
- [ ] ≥2 处 chart 标记（如有数据表）
- [ ] 数据来源汇总完整

---

## 5. 参考文档路径

批量导入：`node scripts/feishu-read-doc.js --batch templates/feishu-reference-urls.txt`

输出目录：`templates/reference/*.md`

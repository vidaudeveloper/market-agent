# 交付标准（TTS / Amazon 全案）

> 所有 TikTok Shop、Amazon 代运营、合作提案类报告**必须**遵守。与 `skills/PROJECT-FACTS.md`、`skills/DATA-SOURCE.md` 并列执行。

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

> **写作总原则（说服优先）**：正文替客户做判断、说人话、有节奏；表格是证据不是叙述。数据完整性靠 Project Facts + 附录保证，**禁止**用堆表代替观点。

### 2.0 第一屏：开篇摘要（强制，禁止表格）

任何对外交付（全案 / 提案 / 测算 / 代运营）在标题与署名之后、进入章节目录之前，必须先有一段 **纯文字**（5–8 行，约 150–280 字），讲清三件事：

1. **卡点**：客户现在最痛 / 最不确定的是什么  
2. **机会**：为什么现在值得做、空间在哪（可带 1–2 个关键数字）  
3. **建议**：接下来 90 天最该先做的 1–2 件事  

**禁止**：第一屏出现 Markdown 表格、KPI 宽表、连续 bullet 超过 5 条。  
**允许**：最多 1 个短引用块 `>` 作导语。

推荐用 **SCQA** 组织第一屏（也可隐式使用，不必写出标签）：

| 字母 | 含义 | 写什么 |
|------|------|--------|
| S | Situation | 现状一句 |
| C | Complication | 矛盾 / 风险一句 |
| Q | Question | 本次要帮他决定什么 |
| A | Answer | 你的主张 + 第一步动作 |

### 2.0b 决策要点（强制，可紧跟第一屏）

用短列表写清（各 1 句即可）：

| 项 | 说明 |
|----|------|
| 决策人 / 读者 | 谁拍板、他最关心增长 / 成本 / 风险中的哪一个 |
| 本次要决定的一件事 | 例：是否签标准档、是否先打爆 1 个 SKU |
| 读完应记住的三句话 | 可与核心结论标题对齐 |

缺客户信息时：基于 intake / 对话合理推断，并标注「*基于 … 假设*」，禁止虚构具体人名或内部会议。

### 2.0c 达人推荐表（强制 — 头像 + 双链接）

凡报告含 **达人推荐 / BD 名单 / 对标达人表**，必须遵守 `skills/chuhaijiang-data/SKILL.md`「飞书交付：达人表头像与链接」：

| 必须 | 禁止 |
|------|------|
| 头像列 Markdown 写 `·`，本地下载后 `tableEmbeds` 上传 | 单元格写 `![](url)` 或外链头像 |
| 出海匠 / TikTok 列写占位文案，`linkPatches` API 写外链 | 单元格写裸 URL 或 `[文字](url)` |
| 导出用 `--embeds-json` 或 pipeline `--export-feishu` | 只写纯文字表就交差 |

**Agent 硬门禁**：写完达人名单后若未生成 embeds-json / 未下载头像，视为交付未完成，不得声称「已导出飞书」。参考：`scripts/build-anta-feishu-test.js`、`scripts/chuhaijiang-pipeline-test.js --export-feishu`。

### 2.1 开篇（第一屏之后）

- **全案 / 调研**：接着写 **❗【核心结论】** 3–6 条，每条含「结论」+「论证闭环」  
- **合作提案**：客户称呼 + 定制说明（尊敬的 XX 品牌方…），再接第一屏与核心卖点  
- **测算 / 代运营**：第一屏文字之后，再用 **执行摘要** 表放 90 天 KPI（表在文字后，不倒置）

#### ❗【核心结论】排版规范（飞书/Markdown 通用）

**禁止：** 每条结论写成一整段加粗长文 + 单行 bullet「论证闭环」，堆在一起难以扫读。

**必须按以下结构**（见 `templates/tts-growth-plan.template.md`）：

```markdown
## 开篇摘要

{{5_TO_8_LINES_PLAIN_TEXT_SCQA}}

## 决策要点

- **决策焦点：** …
- **本次要决定：** …
- **请记住：** ① … ② … ③ …

## ❗【核心结论】

> 以下 N 条为决策摘要…

---

### 结论 1｜短标题（≤20 字，可扫读）

**结论**

1–2 句话，说清判断。

**论证闭环**

数据、对比、数字依据（可 2–4 句）。

---
```

| 元素 | 要求 |
|------|------|
| 开篇摘要 | 纯文字，无表；见 2.0 |
| 短标题 | `### 结论 N｜…`，一眼看懂 |
| 结论段 | 独立段落，**结论** 小标题 + 空行 + 正文 |
| 论证段 | 独立段落，**论证闭环** 小标题 + 空行 + 正文 |
| 分隔 | 每条之间 `---` |
| 阅读指引 | 标题下用 `>` blockquote 说明条数 |
| 金额写法 | **禁用 `$` 符号**（飞书会渲染成公式体）；写「500 万美元」「USD 200」 |
| 数字强调 | 正文数字/百分比**不加粗**；强调放表格或小标题 |

### 2.2 编号与表格规矩

- 一级：`## 一、…` / `## 二、…`
- 二级：`### 1.1 …`
- 禁止跳级

**表格只用于「并列可比的多项数据」**，例如：竞品对比、SKU 结构、渠道占比、报价三档、90 天 KPI。

| 场景 | 用表？ | 用文字？ |
|------|--------|----------|
| 多项横向对比 | ✅ | 表后必须有解读段 |
| 因果 / 建议 / 风险 / 故事 | ❌ | ✅ 短段落 |
| 单一结论里塞一张大宽表 | ❌ | 拆结论，表放附录或本节末 |

**硬约束：**

1. **连续两张表之间必须有 ≥1 段解读**（这张表说明什么 → 所以建议做什么）。禁止表贴表。  
2. 正文核心章禁止「只有 bullet、无观点句」的数据墙；关键数字嵌入句子亦可。  
3. 详尽原始表（多 SKU、全达人名单、全量截图清单）优先放 **`## 附录` / `## 数据来源与证据`**，正文只引用 3–7 个关键数字。

### 2.2b 长度预算（默认上限，可按客户要求放宽）

| 区块 | 上限 | 说明 |
|------|------|------|
| 开篇摘要 | 5–8 行 / ≤280 字 | 见 2.0 |
| 单条核心结论「结论」段 | 1–2 句 | 「论证闭环」≤4 句 |
| 单条诊断（致命/严重/一般） | ≤4 句 | 含影响与动作 |
| 正文主体（不含附录、不含纯数据附表） | 合作提案约 3500–6000 字；增长全案约 4000–8000 字 | 超出则把明细表下沉附录 |
| 附录 | 不限 | 表、截图、来源汇总可详 |

Agent 自检：若某章连续出现 ≥3 张表且表间无解读 → **必须改写后再交付**。

### 2.3 数据密度（TikTok 类必填项）

写报告前尽量补齐；缺数据须写「*基于 … 估算/预估*」。**这些字段优先进入 Project Facts 与附录表；正文只引用支撑主张的数字。**

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

### 2.7 双轨分析与达人对话（默认）

读取 `skills/WORKFLOW-CLIENT-ANALYSIS.md` 与 `delivery-defaults.json`：

| 配置 | 默认值 | 说明 |
|------|--------|------|
| `analysis.dual_track` | **true** | 客户任务默认：Agent 自分析 + 出海匠数据/对话 |
| `creator_agent.enabled` | **true** | 识别达人需求时走对话查名单 |
| `creator_agent.intake_template` | `templates/intake-creator-agent.json` | 对话前必填清单 |
| `chuhaijiang.agent_ask_script` | `chuhaijiang-agent-ask.js` | 策略与达人 BD 名单 |
| `chuhaijiang.sessions_file` | `output/chuhaijiang-agent-sessions.json` | 续聊索引 |

### 2.8 飞书导出（默认开启）

读取 `templates/config/delivery-defaults.json`：

| 配置 | 默认值 | 说明 |
|------|--------|------|
| `chuhaijiang.auto_pipeline` | **true** | TTS 类报告写竞品章前**默认**跑 `chuhaijiang-pipeline-test.js` |
| `chuhaijiang.merge_into_report` | **true** | 达人/店铺/商品表 + 截图并入报告，不单开附件 |
| `export.feishu` | **true** | 报告落盘 `output/` 后自动导出飞书 |
| `export.charts` | **true** | 有 `<!-- chart -->` 时加 `--charts` |
| `export.auto_after_report` | **true** | TTS/Amazon 全案完成后自动执行，无需用户再说「导出飞书」 |
| `export.skip_flag` | `--no-feishu` | 用户明确不要飞书时使用 |

**标准流程**：`Intake` → `Project Facts` → `双轨分析` → `validate + gate` → `[达人对话]` → `output/*.md` → `feishu-export --charts`

命令：`node scripts/feishu-export.js output/xxx.md "标题" --charts`

---

## 4. 导出前自检（Agent 必做）

- [ ] 文档类型与 skill 匹配
- [ ] `output/{project}-project-facts.json` 已建立且无凭证
- [ ] `project-facts validate` 与目标 skill gate 已通过
- [ ] 报告精确数字可从 `facts[].evidence_ids` 回溯
- [ ] **双轨分析已完成并合并**（见 WORKFLOW-CLIENT-ANALYSIS.md）
- [ ] 已跑出海匠 pipeline 并并入报告（TTS 类默认）
- [ ] 达人需求已整理 intake-creator-agent 并走 agent-ask（若触发）
- [ ] **第一屏「开篇摘要」**：纯文字 5–8 行，无表格；含卡点 / 机会 / 建议
- [ ] **决策要点**：决策焦点 + 本次要决定 + 三句记住
- [ ] 有核心结论或执行摘要（执行摘要表须在第一屏文字之后）
- [ ] **无表贴表**：连续两张表之间有解读段；宽表优先在附录
- [ ] 正文长度未明显超预算（超长明细已下沉附录）
- [ ] 含 30/90 天或渠道结构（或已标注估算；正文只引用关键数）
- [ ] 竞品 ≥2 且有「启示」或对标表
- [ ] 有时间计划（月/周）
- [ ] 合作案含 Package 交付数量 + **报价倒推过程**（tts-pricing-logic）
- [ ] TTS 分析含出海匠数据表与截图证据（表多时可放附录，正文有解读）
- [ ] ≥2 处 chart 标记（如有数据表）
- [ ] 数据来源汇总完整

---

## 5. 参考文档路径

批量导入：`node scripts/feishu-read-doc.js --batch templates/feishu-reference-urls.txt`

输出目录：`templates/reference/*.md`

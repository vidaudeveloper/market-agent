---
name: tts-growth-plan
description: "TikTok市场分析+选品+打品+执行计划。触发词：TikTok市场分析、选品推荐、打品建议、500万美金目标、TTS全案。对标出海匠NARRAK题+紫晶结论块。"
---

# TikTok 增长全案 / Growth Plan

## 触发方式

- "布局 TikTok" / "市场分析+选品+打品"
- "年销售额 500 万、客单 700" / "从 6 月启动的执行计划"

## 必读

1. `skills/PROJECT-FACTS.md`
2. `skills/DELIVERY-STANDARD.md`
3. `templates/tts-growth-plan.template.md`
4. `templates/intake-tts.json`
5. 结论块参考：`templates/reference/紫晶海外社媒调研-2026.md`（前 40 行）

## Intake 八项（缺一必问）

1. 品牌名
2. Amazon 链接
3. TikTok 店（有/无、本土/跨境、链接）
4. 目标年销售额 + ASP
5. 启动月份
6. 核心 SKU / 库存
7. 月广告+服务预算区间
8. 已知竞品或类目关键词

## 执行流程

```
1. 填写 intake-tts.json 或对话收集
2. 创建项目 Project Facts；所有数据与截图写入同一事实包
3. **默认** 出海匠 pipeline（见 delivery-defaults.json）：
   node scripts/chuhaijiang-pipeline-test.js --keyword "{品牌或品类}"
   → 将达人/店铺/商品表 + 截图并入第三章「竞品调研」
4. WebFetch Amazon 产品页并登记 evidence
5. validate + gate --skill tts-growth-plan；BLOCKER 未清零停止
6. 先写「开篇摘要」+「决策要点」，再写 ❗【核心结论】3–6 条（见 DELIVERY-STANDARD 2.0 / 排版规范）
7. 按模板填八章；选品表必须含「暂缓」项及理由
8. 目标拆解：年 GMV → 年订单 → 月/日
9. 执行计划：从 launch_month 起，周/月节点
10. chart ≥2
11. 报告落盘 output/{BRAND}-TTS增长全案-{DATE}.md
12. **默认** feishu-export --charts（用户未说「不要飞书」则自动执行）
```

> 编排顺序固定为：**出海匠数据 → 写报告 → 飞书导出**。有 MCP 时优先 `chuhaijiang_pipeline` + `feishu_export`。

## 强制章节

1. **开篇摘要**（5–8 行纯文字，无表）+ **决策要点**
2. ❗【核心结论】3–6 条（**须遵守排版规范**）
3. 品牌与产品
4. 美区市场分析
5. 竞品调研（≥2，含雷达图可选）
6. 选品推荐（首发/备选/暂缓）
7. 打品建议（内容/达人/广告）
8. 目标拆解（反推表）
9. 执行计划（时间轴）
10. 风险合规 + 数据来源汇总（明细表可放附录）

## 目标反推公式（须展示）

```
年订单量 ≈ 年 GMV ÷ ASP
月均 GMV ≈ 年 GMV ÷ 12（或按爬坡曲线分配）
月均订单 ≈ 年订单 ÷ 12
```

爬坡非线性时，用 M1/M3/M6/M12 表 + line 图。

## 图表

| 章节 | 标记 |
|------|------|
| 竞品 | `<!-- chart:radar -->` |
| GMV 爬坡 | `<!-- chart:line -->` |
| 内容/预算 | `<!-- chart:bar -->` 或 doughnut |

## 输出

`output/{BRAND}-TTS增长全案-{DATE}.md`

## 与 partnership 的区别

| 本文档 | tts-partnership-proposal |
|--------|--------------------------|
| 策略+选品+节点 | 商务报价+Package+案例 |
| 给品牌/内部决策 | 给客户签单 |

可组合：`tts-full-case` 一次产出两份。

---

## ❗【核心结论】排版规范

复制 `templates/tts-growth-plan.template.md` 开头块：**开篇摘要** → **决策要点** → **❗【核心结论】**。**禁止**单行超长加粗；**第一屏禁止表格**。

| 步骤 | 做法 |
|------|------|
| 0 | 5–8 行纯文字（SCQA：现状→矛盾→要决定什么→主张） |
| 0b | 决策要点三行：决策焦点 / 本次要决定 / 请记住 |
| 1 | 标题下 `>` 阅读指引（共几条） |
| 2 | 每条用 `### 结论 N｜短标题` |
| 3 | 分 **`**结论**`** 与 **`**论证闭环**`** 两段，各空一行 |
| 4 | 条与条之间 `---` |
| 5 | 结论段 1–2 句；论证段含数字/对比 |
| 6 | 正文表与表之间必须有解读；明细表下沉附录 |

### 金额与排版（飞书）

- **禁止**在正文使用 `$`（飞书 Markdown 会当 LaTeX 公式，数字变「公式体」）
- 金额写：**500 万美元**、**USD 200**、**USD 50K/月**
- 正文数字、百分比**不加粗**；KPI 放表格（且在「开篇摘要」之后）
- 导出时 `scripts/markdown-feishu-sanitize.js` 会自动兜底清理

自检：飞书导出后第一屏应是**可读短文**，每条结论为**独立小节**，而非一堵文字墙或表墙。

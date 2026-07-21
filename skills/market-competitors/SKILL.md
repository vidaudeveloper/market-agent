---
name: market-competitors
description: "竞品情报分析。触发词：竞品分析、竞争对手、竞品对比。识别竞品、分析营销策略、产出 COMPETITOR-REPORT.md。"
---

# 竞品情报分析 / Competitive Intelligence

## 触发方式
- "分析 https://xxx.com 的竞争对手"
- "帮我做竞品调研"
- "和竞品对比一下"

## Project Facts 门禁

先读 `skills/PROJECT-FACTS.md`。竞品实体统一写入 `entities.competitors`，核心指标写入 `facts` 并关联 evidence；默认至少 2 家：

```bash
node scripts/project-facts.js gate --file output/{project}-project-facts.json --skill market-competitors
```

TikTok Shop 竞品优先走出海匠 `search → get_detail → get_related(similar/creators/videos)`。

**官网 / Amazon 店铺截图**（视觉证据）按 `skills/competitor-screenshots/SKILL.md` 执行：优先「克隆日常 Chrome 配置 + `--profile auth/chrome-user-clone --headed`」，不要依赖本机常失败的 CDP 挂接。

## 执行流程

### 第一步：竞品识别（三类）

| 类型 | 定义 | 发现方法 |
|------|------|----------|
| **直接竞品** | 同产品、同受众、同市场 | 关键词搜索、"[品牌] alternatives" |
| **间接竞品** | 不同产品、解决同问题 | 问题导向搜索 |
| **标杆竞品** | 行业头部、品牌向往的对象 | 品类领导者 |

### 第二步：竞品分析框架

为每个竞品分析：
- **品牌信息**：标题、价值主张、目标受众、差异化、声调
- **定价对比**：各套餐价格、免费试用、年度折扣
- **功能矩阵**：Full / Partial / No / Beta
- **SEO 对比**：博客数量、发布频率、内容深度、关键词
- **社媒对比**：各平台粉丝数、发布频率、互动率
- **评价挖掘**：G2/Capterra 评分、好评点、差评点

### 第三步：SWOT 分析
为每个竞品生成 SWOT（优势/劣势/机会/威胁），再汇总为目标的整体 SWOT。

### 第四步：战略建议
- **可借鉴策略**（5-10个，含实施难度和预期影响）
- **差异化定位**（5个角度）
- **竞品对比页策略**（为每个主要竞品设计对比页结构）
- **转化叙事**（从每个竞品迁移到你的产品的故事脚本）

### 第五步：监控计划
- 竞品监控清单（Google Alerts、社媒关注、定价页面月度检查等）
- 竞品回应策略表

## 数据来源标注（必填）

须遵守 `skills/DATA-SOURCE.md`：每个含**具体数字/评分/排名/KPI**的数据块下方追加一行 `*数据来源：...*` 或 `*基于 ... 估算/预估*`；报告末尾附 `## 数据来源汇总`。

## 输出
生成 `output/COMPETITOR-REPORT.md`

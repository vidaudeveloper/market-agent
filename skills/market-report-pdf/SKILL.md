---
name: market-report-pdf
description: "PDF报告导出。触发词：导出PDF、生成PDF报告、打印报告。将营销分析结果导出为精美的 PDF 报告。"
---

# PDF 报告导出 / PDF Report Generator

## 触发方式
- "把所有分析结果导出成 PDF"
- "生成一份客户用的 PDF 报告"
- "帮我把报告打印出来"

## PDF vs Markdown

| 格式 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| PDF | 客户演示、邮件附件 | 专业外观、图表、可打印 | 不易编辑 |
| Markdown | 内部使用、快速参考 | 易编辑、版本控制友好 | 不够精美 |

> 给客户/潜在客户的报告用 PDF，内部使用用 Markdown。

## 前置条件
- 至少运行了一个分析技能（market-audit 等）
- 检查 `output/` 目录下的分析文件
- 若项目有 `output/{project}-project-facts.json`：导出前先 `project-facts validate`，并对上游 skill 跑过 gate；PDF 只固化已校验的报告，不重新生成或改写数字
- PDF 须保留正文的数据来源标注与「数据缺口与假设」章节，不得因排版删除

## 数据收集
汇总以下文件中的数据：
- `output/MARKETING-AUDIT.md`
- `output/LANDING-CRO.md`
- `output/SEO-AUDIT.md`
- `output/BRAND-VOICE.md`
- `output/COMPETITOR-REPORT.md`
- `output/FUNNEL-ANALYSIS.md`

## 报告结构

1. **封面**：品牌名 + 日期 + 综合评分
2. **执行摘要**：2-4句总结 + 关键机会
3. **评分仪表盘**：六大类得分（可视化进度条）
4. **详细发现**：逐类呈现分析结果
5. **竞品对比矩阵**
6. **优先级行动计划**
7. **收入影响汇总**
8. **附录**：方法论、工具、术语表

## 数据来源标注（必填）

须遵守 `skills/DATA-SOURCE.md`：每个含**具体数字/评分/排名/KPI**的数据块下方追加一行 `*数据来源：...*` 或 `*基于 ... 估算/预估*`；报告末尾附 `## 数据来源汇总`。

## 输出
生成 `output/MARKETING-REPORT.pdf`

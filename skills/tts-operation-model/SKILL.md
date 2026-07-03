---
name: tts-operation-model
description: "TikTok运营测算/店铺诊断。触发词：运营测算、TTS诊断、Kalodata分析、店铺对标。对标 Vanson 运营测算文档。"
---

# TikTok 运营测算 / Operation Model

## 触发方式

- "做 TikTok 运营测算"
- "诊断这个 TTS 店铺"
- "对标行业头部算 GMV"

## 必读

1. `skills/DELIVERY-STANDARD.md`
2. `templates/reference/V3-Vanson-汽车检测仪器美区-TikTok-运营测算.md`
3. 模板：`templates/tts-operation-model.template.md`

## Intake

| 字段 | 说明 |
|------|------|
| shop_name / shop_url | TTS 或 Kalodata 店铺 |
| category | 美区类目 |
| asp_usd | 客单价（测算用） |
| target_monthly_gmv | 可选目标 |

## 执行流程

```
1. chuhaijiang / Kalodata 数据：近30/90天、渠道、达人、内容
2. 拉类目 Top 店铺对标（至少 5–9 家）
3. 复制 tts-operation-model.template.md → output/{BRAND}-TTS运营测算-{DATE}.md
4. 写「相对位置」必须含倍数差距
5. 问题诊断：≥1 致命 + ≥2 严重，带 ⚠️
6. 分阶段 GMV 表 + 财务假设 + chart 标记
7. feishu-export --charts
```

## 强制章节

1. 店铺核心数据（指标 / 渠道 / 达人内容 / 30天趋势）
2. 行业对标（类目特征 / Top 店铺 / 相对位置 / 成功公式）
3. 核心问题诊断（分级 + ⚠️）
4. 分阶段目标（冷启/放量/爆发）
5. 财务测算（ASP、ACoS、佣金、利润）
6. 行动建议优先级
7. 数据来源汇总

## 深度标准

- **成功公式** + ⭐ 重要性排序（7 项以内）
- 渠道结构四象限：达人 / 商品卡 / 自营 / 商城
- 与头部对比至少 **3 个维度** 写倍数差距

## 图表（≥3 处）

| 章节 | 标记 |
|------|------|
| 渠道占比 | `<!-- chart:doughnut -->` |
| GMV/销量爬坡 | `<!-- chart:line -->` |
| 月预算 | `<!-- chart:bar -->` |

## 输出

`output/{BRAND}-TTS运营测算-{DATE}.md`

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

1. `skills/PROJECT-FACTS.md`
2. `skills/DELIVERY-STANDARD.md`
3. `skills/chuhaijiang-data/SKILL.md`（对标数据 + 截图）
4. `skills/tts-pricing-logic/SKILL.md`（有目标 GMV 时联动报价）
5. 模板：`templates/tts-operation-model.template.md`

## Intake

| 字段 | 说明 |
|------|------|
| shop_name / shop_url | TTS 或 Kalodata 店铺 |
| category | 美区类目 |
| asp_usd | 客单价（测算用） |
| target_monthly_gmv | 可选目标 |

## 执行流程

```
1. chuhaijiang-pipeline-test / fetch：店铺对标 + 达人 + 截图证据
2. 拉类目 Top 店铺对标（至少 5–9 家）
3. 数据统一写入 Project Facts；validate + gate --skill tts-operation-model
4. 复制 tts-operation-model.template.md → output/{BRAND}-TTS运营测算-{DATE}.md
5. 写「相对位置」必须含倍数差距；附出海匠截图章节
6. 问题诊断：≥1 致命 + ≥2 严重，带 ⚠️
7. 分阶段 GMV 表 + 财务假设 + chart 标记
8. 有 GMV 目标 → 引用 tts-pricing-logic 输出人手/月费测算
9. feishu-export --charts
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

---
name: amazon-agency-plan
description: "Amazon代运营方案。触发词：Amazon代运营、Listing优化、PPC方案、ASIN分析。对标 NARRAK B0DCVSB4WX 代运营稿。"
---

# Amazon 代运营方案 / Amazon Agency Plan

## 触发方式

- "Amazon 代运营" / "ASIN 分析" / "Listing + PPC 方案"

## 参考

- 事实契约：`skills/PROJECT-FACTS.md`
- 样例：`output/B0DCVSB4WX-NARRAK-Amazon分析与代运营方案.md`
- 与 TTS 组合时使用 `tts-full-case`

## 强制章节

0. **给老板看的话** + **客户关切**（见 `DELIVERY-STANDARD.md` 2.0；纯文字先行）
1. 执行摘要（90 天 KPI 表，须在第一屏文字之后）
2. 产品深度分析（参数 / SWOT / 人群）
3. 竞争格局（竞品表 + 雷达图；表间有解读）
4. Listing 优化（标题 / 五点 / A+ 清单）
5. Amazon 广告策略（词包 / SP-SB 结构）
6. 代运营方案（服务模块 / **月预算表** / 90 天路线）
7. KPI 与 ROI（销量曲线 + 单元经济）
8. 风险 + 报价参考 + 数据来源汇总

## 图表

- 人群 doughnut、竞品 radar、预算 bar、销量 line（见 `market-chart`）

## 数据

- WebFetch Amazon 产品页
- 数字须 DATA-SOURCE 标注
- 官网/Amazon/竞品材料统一写入 Project Facts
- 最终分析前执行 `gate --skill amazon-agency-plan`
- 未接 Amazon 专属数据 API 时，不声称掌握真实销量、BSR 历史、PPC 或转化数据

## 输出

`output/{ASIN}-{BRAND}-Amazon代运营-{DATE}.md`

## 与 TTS 分工

| Amazon 本 skill | TikTok 用 tts-* |
|-----------------|-----------------|
| Listing/PPC/FBA | 达人/直播/Spark Ads |
| BSR/Review | 渠道占比/GMV Max |

双渠道项目：**各出一份**，勿混在一篇里省略结构。

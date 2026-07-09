---
name: tts-full-case
description: "TTS全案编排。触发词：TTS全案、TikTok代运营全套、市场分析+合作方案。组合 growth-plan + partnership + operation-model。"
---

# TTS 全案编排 / Full Case Orchestrator

## 何时使用

用户需要**接近参考案例完整度**的一揽子交付（**输出署名 Vidau**）：

- 市场分析 + 选品 + 打品 + 时间节点
- 运营测算 / 店铺诊断
- 合作提案 + Package + 报价

## 必读

- `skills/DELIVERY-STANDARD.md`
- `skills/tts-growth-plan/SKILL.md`
- `skills/tts-partnership-proposal/SKILL.md`
- `skills/tts-operation-model/SKILL.md`（有 TTS 店铺数据时）
- `skills/chuhaijiang-data/SKILL.md`
- `skills/tts-pricing-logic/SKILL.md`（报价章节）
- `skills/market-chart/SKILL.md`
- `skills/feishu-export/SKILL.md`

## 标准 Pipeline

```
阶段 0 — Intake
  └─ 读 templates/intake-tts.json，缺项提问

阶段 1 — 数据采集（分析环节，必做）
  ├─ node scripts/chuhaijiang-pipeline-test.js --keyword "品类" [--export-feishu]
  │    → 达人/店铺/商品表 + 出海匠截图证据
  ├─ 或分步：chuhaijiang-fetch.js shop-ranking / product-search
  ├─ WebFetch：Amazon 产品/店铺
  └─ 可选：feishu-read 拉内部案例结构

阶段 2 — 主报告（必做）
  └─ tts-growth-plan → 含出海匠数据表 + 截图引用章节

阶段 3 — 测算（有 TTS/Kalodata 数据时必做）
  └─ tts-operation-model → 引用出海匠对标数据

阶段 4 — 合作提案（用户要报价/签单时）
  └─ tts-partnership-proposal + tts-pricing-logic（GMV倒推→四岗位报价）

阶段 5 — Amazon 补充（有 Amazon 链接时）
  └─ amazon-agency-plan → output/{BRAND}-Amazon代运营-{DATE}.md

阶段 6 — 图表 + 飞书
  ├─ 各 md 内 <!-- chart --> 标记
  └─ node scripts/feishu-export.js <file> "标题" --charts（**默认自动**，见 delivery-defaults.json）
```

## 交付物对照（结构参考案例 → Vidau 输出）

| 参考案例 | 本工具输出 |
|----------|------------|
| NARRAK TTS 合作方案 | `{BRAND}-TTS合作方案` |
| Vanson 运营测算 | `{BRAND}-TTS运营测算` |
| 出海匠 NARRAK 题 | `{BRAND}-TTS增长全案` |
| NARRAK Amazon 稿 | `{BRAND}-Amazon代运营` |

## 质量门禁

导出前对**每一份** md 跑 `DELIVERY-STANDARD` 自检清单。

## 单文档 vs 多文档

| 场景 | 建议 |
|------|------|
| 客户签单 | 合作方案 + 增长全案（2 份飞书） |
| 内部测算 | 仅运营测算 |
| 从 0 布局 TikTok | 增长全案为主，附测算 |

## 禁止

- 跳过 intake 直接写数字
- 只出一份笼统「营销方案」不区分 skill
- WebFetch 读飞书案例链接（用 feishu-read-doc）

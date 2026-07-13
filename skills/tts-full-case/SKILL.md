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
- `skills/WORKFLOW-CLIENT-ANALYSIS.md`
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
  └─ 若识别达人需求：读 templates/intake-creator-agent.json

阶段 1 — 双轨数据采集（分析环节，必做）
  ├─ 轨道 A：Agent 按 skill 框架自分析（WebFetch / 用户资料）
  ├─ 轨道 B1：chuhaijiang-pipeline-test.js --keyword "品类"
  │    → 达人/店铺/商品表 + 截图证据
  └─ 轨道 B2（按需）：chuhaijiang-agent-ask.js
       → 策略方案；达人需求时 --session 续聊名单

阶段 2 — 主报告（必做）
  └─ tts-growth-plan → 含「Agent 分析」「出海匠结论」「综合结论」三章

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

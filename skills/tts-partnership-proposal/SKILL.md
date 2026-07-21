---
name: tts-partnership-proposal
description: "TTS合作提案/代运营报价。触发词：TTS合作方案、达人带货合作、Vidau提案、TikTok代运营报价。对标 NARRAK/LLano/Insta360 合作方案结构（输出署名 Vidau）。"
---

# TTS 合作提案 / Partnership Proposal

## 触发方式

- "TTS 合作方案" / "代运营报价" / "达人带货合作方案"
- "像 NARRAK 案例那样写 Vidau 合作提案"

## 必读

1. `skills/PROJECT-FACTS.md`
2. `skills/DELIVERY-STANDARD.md`
3. `skills/tts-pricing-logic/SKILL.md`（**报价必用**）
4. 参考案例：`templates/reference/NARRAK-Electric-Bike-&-Yatop-TTS合作方案.md`、`绿巨能LLano-&-Yatop-TTS全案运营合作方案.md`
5. 填空模板：`templates/tts-partnership.template.md`
6. 机构默认配置：`templates/config/agency-defaults.json`（**署名 Vidau，禁止 Yatop/雅拓**）

## Intake（缺项必问）

读取或对照 `templates/intake-tts.json`：

| 字段 | 必填 |
|------|------|
| brand_name | ✓ |
| amazon_product_url | ✓ |
| tiktok_shop_url / stage | ✓ |
| hero_sku | ✓ |
| competitor_shop_names（≥2） | ✓ |
| deliverables（BGC/达人/直播） | ✓ |
| pricing tiers | 可用 agency-defaults |

## 执行流程

```
1. 读 intake + agency-defaults + pricing-logic.json
2. chuhaijiang-pipeline-test 或 fetch：竞品/达人/店铺 + 截图
3. WebFetch Amazon 产品页；全部结果写入 Project Facts
4. validate + gate --skill tts-partnership-proposal
5. 复制 tts-partnership.template.md → output/{BRAND}-TTS合作方案-{DATE}.md
6. 按「强制章节」填满；竞品每家「启示」≥3 条
7. **报价章**：按 tts-pricing-logic GMV→视频量→四岗位→月费/季度费
8. 插入 ≥2 处 <!-- chart -->；附出海匠截图证据
9. feishu-export --charts
```

## 强制章节（不可省略）

0. **开篇摘要** + **决策要点**（见 DELIVERY-STANDARD 2.0）
1. 客户称呼 + 定制说明
2. 服务商体系 + 案例链接（来自 agency-defaults，可占位）
3. **店铺&产品分析**（四段：店铺/产品/总结/TK阶段；表前有一句定位）
4. **竞品&市场**（≥2 竞品，每家：达人/内容/渠道 + **启示**；表间有解读）
5. **人群定位**（3 类 + 占比表 + doughnut 图）
6. **流量转化**（Spark / 信息流 / 购物广告 + 预算与 ACoS）
7. **方案 Package 90天**（BGC/达人视频/直播小时 **必须量化**）
8. **报价套组**（三级 + **GMV 倒推明细**，见 tts-pricing-logic）
9. 结语 + 数据来源汇总（明细宽表可放附录）

**达人名单硬门禁**：凡含推荐达人表，必须按 `chuhaijiang-data`「头像 + 出海匠/TikTok 双链接」导出（`·` 占位 + embeds-json），禁止纯文字交差。

## 深度标准

| 章节 | 最低要求 |
|------|----------|
| 产品分析 | ≥4 子项（配置/亮点/场景/配件或配置） |
| 竞品 | 每家 ≥3 条「对 XX 的启示」 |
| 渠道 | 写清达人/商品卡/自营/商城占比或说明无数据 |
| Package | 三行交付数量不可为「待定」 |

## 图表

| 位置 | 标记 |
|------|------|
| 人群占比 | `<!-- chart:doughnut -->` |
| 竞品雷达 | `<!-- chart:radar -->` |

## 输出

- 文件：`output/{BRAND}-TTS合作方案-{YYYY-MM-DD}.md`
- 飞书：`node scripts/feishu-export.js ... --charts`

## 禁止

- 用通用 `market-proposal` 代替本 skill 写 TTS 合作案
- 无 Package 交付数量的「合作方案」
- 竞品只列表不写启示

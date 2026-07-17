---
name: market-seo
description: "SEO审计。触发词：SEO分析、搜索优化、搜索引擎排名、站内优化、E-E-A-T。含站内SEO、内容质量、技术SEO、关键词分析。"
---

# SEO 审计 / SEO Content Audit

## 触发方式
- "分析 https://xxx.com 的 SEO"
- "帮我做 SEO 审计"
- "这个网站的搜索优化怎么样"

## Project Facts 门禁

先读 `skills/PROJECT-FACTS.md`，登记官网页面、robots、sitemap、Schema 等 evidence，再执行：

```bash
node scripts/project-facts.js gate --file output/{project}-project-facts.json --skill market-seo
```

未接 Search Console、SERP、Lighthouse 或全站爬虫时，只做公开页面快速审计；不得声称真实排名、搜索量、流量或 Core Web Vitals 已实测。

## 第一步：站内 SEO 检查

### 标题标签
- 长度 50-60 字符 / 含主关键词 / 品牌名 / 吸引点击

### 元描述
- 存在 / 150-160 字符 / 含关键词 / 行动号召

### 标题层级 (H1-H6)
- 每页一个 H1 / 含关键词 / 层级不跳跃

### 图片优化
- Alt 文本 / 描述性文件名 / WebP 格式 / 懒加载

### 内部链接
- 相关性 / 锚文本质量 / 无死链

### URL 结构
- 可读 / 含关键词 / 连字符分隔 / 全小写

## 第二步：内容质量评估 (E-E-A-T)

| 维度 | 评估要点 |
|------|----------|
| **经验** | 一手案例、截图、实操细节 |
| **专业** | 作者资质、内容深度、信息准确 |
| **权威** | 行业认可、外链质量、媒体报道 |
| **可信** | HTTPS、隐私政策、真实联系信息 |

## 第三步：关键词分析
- 主关键词评估
- 搜索意图匹配（信息型/商业型/交易型/导航型）
- 5-10个辅助关键词建议

## 第四步：技术 SEO 快速检查
- robots.txt / sitemap.xml
- Canonical 标签
- Core Web Vitals：LCP < 2.5s, FID < 100ms, CLS < 0.1
- 移动端友好

## 第五步：Schema 结构化数据审计
检查 Organization、Article、FAQ、Product、BreadcrumbList 等 Schema 是否存在

## 数据来源标注（必填）

须遵守 `skills/DATA-SOURCE.md`：每个含**具体数字/评分/排名/KPI**的数据块下方追加一行 `*数据来源：...*` 或 `*基于 ... 估算/预估*`；报告末尾附 `## 数据来源汇总`。

## 输出
生成 `output/SEO-AUDIT.md`

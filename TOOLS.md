# 工具目录 TOOLS.md — AI营销全案策划师

> 项目路径：见本仓库根目录 · 用户说明见 `README.md` · **Agent 配置边界见 `AGENT.md`（勿向用户索要 AI_API_KEY）**

## 技能类（AI 读取 skills/ 目录自动执行）

### 核心营销分析

| # | 技能 | 中文名称 | 输入 | 产出 | 免费 |
|---|------|----------|------|------|------|
| 1 | market-audit | 营销全量审计 | 网站 URL | MARKETING-AUDIT.md（评分+建议） | ✅ |
| 2 | market-brand | 品牌声调分析 | 网站 URL | BRAND-VOICE.md（调性指南） | ✅ |
| 3 | market-competitors | 竞品情报分析 | 网站 URL | COMPETITOR-REPORT.md | ✅ |
| 4 | market-report | 营销报告生成 | 已有分析数据 | MARKETING-REPORT.md | ✅ |
| 5 | market-funnel | 转化漏斗分析 | 网站 URL | FUNNEL-ANALYSIS.md | ✅ |
| 6 | market-landing | 落地页 CRO | 落地页 URL | LANDING-CRO.md | ✅ |
| 7 | market-seo | SEO 审计 | 网站 URL | SEO-AUDIT.md | ✅ |

### 内容与创意

| # | 技能 | 中文名称 | 输入 | 产出 | 免费 |
|---|------|----------|------|------|------|
| 8 | market-copy | 文案优化分析 | 网站 URL | COPY-SUGGESTIONS.md | ✅ |
| 9 | market-emails | 邮件序列生成 | 主题/URL | EMAIL-SEQUENCES.md | ✅ |
| 10 | market-social | 社媒内容日历 | 主题/URL | SOCIAL-CALENDAR.md | ✅ |
| 11 | market-ads | 广告创意生成 | 网站 URL | AD-CAMPAIGNS.md | ✅ |

### 策略与交付

| # | 技能 | 中文名称 | 输入 | 产出 | 免费 |
|---|------|----------|------|------|------|
| 12 | market-launch | 产品上市策略 | 产品描述 | LAUNCH-PLAYBOOK.md | ✅ |
| 13 | market-proposal | 客户提案生成 | 客户信息 | PROPOSAL.md | ✅ |
| 14 | market-report-pdf | PDF 报告导出 | 分析数据 | MARKETING-REPORT.pdf | ✅ |
| 15 | feishu-export | 飞书文档导出 | output/*.md | 飞书云文档链接 | ✅ |

### 电商数据

| # | 工具 | 中文名称 | 输入 | 产出 | 免费 |
|---|------|----------|------|------|------|
| 16 | chuhaijiang-data | 出海匠 TikTok 数据 | 商品/店铺查询 | 数据表格 | ✅ 基础版 |

> **输出规范**：所有含数字的数据块须标注来源，见 `skills/DATA-SOURCE.md`。

---

## 脚本类（scripts/ 目录，可独立运行）

> **数据来源**：脚本输出与 Agent 报告均须按 `skills/DATA-SOURCE.md` 标注来源。

| 脚本 | 功能 | 命令示例 |
|------|------|----------|
| `chuhaijiang-fetch.js` | 出海匠数据抓取 | `node scripts/chuhaijiang-fetch.js shop-ranking` |
| `ai-analyze.js` | 调用 AI API 分析文本（**需 `.env` 中 AI_API_KEY**） | `node scripts/ai-analyze.js "分析这段文案"` |
| `chart-gen.js` | QuickChart 图表 PNG（**无需 AI_API_KEY**） | `node scripts/chart-gen.js --type radar ...` |
| `chart-markdown.js` | Markdown `<!-- chart -->` → QuickChart（**无需 AI_API_KEY**） | `node scripts/chart-markdown.js output/report.md` |
| `ai-chart.js` | 兼容入口（转发 chart-markdown） | `node scripts/ai-chart.js output/report.md` |
| `feishu-insert-charts.js` | 已有飞书文档按需插图 | `node scripts/feishu-insert-charts.js --doc <id> --markdown output/report.md` |
| `feishu-read-doc.js` | 读取飞书 docx/wiki → Markdown | `node scripts/feishu-read-doc.js --url "https://...feishu.cn/docx/..."` |
| `feishu-auth.js` | 飞书 OAuth 授权（自动开浏览器） | `node scripts/feishu-auth.js` |
| `feishu-export.js` | 导出 Markdown 到用户飞书 | `node scripts/feishu-export.js output/report.md "标题" --charts` |

---

## 可选 MCP 扩展（需单独安装）

以下 MCP 服务器可扩展工具箱能力。参考 `mcp.example.json` 配置，合并到你的 `~/.workbuddy/mcp.json`。

| 工具 | GitHub | 能力 | 费用 | 推荐度 |
|------|--------|------|------|--------|
| Trends MCP | trendsmcp/trends-mcp | 20+ 平台趋势查询 | 免费层 | ⭐⭐⭐⭐⭐ |
| Lighthouse MCP | danielsogl/lighthouse-mcp-server | 网页性能/SEO/可访问性审计 | 免费 | ⭐⭐⭐⭐ |
| SEO Crawler MCP | houtini-ai/seo-crawler-mcp | 全站批量爬取+SQL 分析 | 免费 | ⭐⭐⭐⭐ |
| Serper MCP | marcopesani/mcp-server-serper | Google SERP 搜索 | 2500次/月免费 | ⭐⭐⭐⭐⭐ |
| Content Optimizer | sharozdawa/content-optimizer | SurferSEO 替代，内容评分 | 免费 | ⭐⭐⭐ |
| Social Media MCP | thomasgorisse/social-media-mcp | AI 生成社媒帖子 | 免费 | ⭐⭐⭐ |
| web-meta-scraper | cmg8431/web-meta-scraper | OG/JSON-LD 抓取 | 免费 | ⭐⭐⭐ |

---

## 安装 MCP 工具

以 Trends MCP 为例：

```bash
# 1. 安装
npx @smithery/cli install @trendsmcp/trends-mcp

# 2. 在 ~/.workbuddy/mcp.json 中添加配置（参考 mcp.example.json）

# 3. 在 WorkBuddy 中点击"信任"该 MCP 服务器

# 4. 使用：对 AI 说"查一下 TikTok 上最近关于 skincare 的趋势"
```

多个 MCP 可同时安装，互不冲突。按需选择即可。

# Project Facts：统一事实数据包与质量门禁

> 所有分析、内容、提案和 TTS/Amazon 方案共用。目标是让不同 skill 消费同一批事实，避免各模块重复搜索、数字冲突或凭空补全。

## 1. 核心文件

每个客户项目创建一份：

```text
output/{project}-project-facts.json
```

数据契约示例：`templates/project-facts.example.json`  
JSON Schema：`schemas/project-facts.schema.json`  
模块门禁配置：`templates/config/fact-gates.json`

禁止把 API Key、Cookie、飞书 Secret 或其他凭证写入 Project Facts。

## 2. 标准流程

```text
Intake
→ init Project Facts
→ 官网/用户材料/出海匠 API/Playwright 采集
→ 写入 entities + evidence + facts + screenshots
→ validate
→ 针对目标 skill 执行 gate
→ gate 通过后分析
→ 报告引用 facts 与 evidence
→ 图表 + 飞书
```

### 初始化

```bash
node scripts/project-facts.js init \
  --out output/{project}-project-facts.json \
  --intake output/{project}-intake.json
```

也可以用仓库模板建立空壳：

```bash
node scripts/project-facts.js init \
  --out output/{project}-project-facts.json \
  --brand "品牌" \
  --product "产品" \
  --name "项目名"
```

### 结构与证据引用校验

```bash
node scripts/project-facts.js validate --file output/{project}-project-facts.json
```

采集工具返回结构化结果时，先生成只包含要更新字段的 JSON 补丁，再安全合并（对象递归合并；带 `id` 的实体/evidence/fact 按 id 更新）：

```bash
node scripts/project-facts.js merge \
  --file output/{project}-project-facts.json \
  --patch output/{project}-facts-patch.json
```

合并后会自动校验；校验失败不会覆盖原事实包。

### 出海匠 pipeline 自动回写

`chuhaijiang-pipeline-test.js` 运行后会：

1. 把 `output/出海匠链路测试-{date}.json` 内路径规范为仓库相对 POSIX；
2. 生成 `output/facts-patch-chj-{date}.json`（实体 + 证据 + 截图，路径已相对化）；
3. 传 `--facts` 时直接合并到事实包。

```bash
node scripts/chuhaijiang-pipeline-test.js --keyword "品类" --facts output/{project}-project-facts.json
# 或对已有 meta 手动映射：
node scripts/chuhaijiang-facts-mapper.js --meta output/出海匠链路测试-{date}.json --facts output/{project}-project-facts.json
```

MCP 环境下给 `chuhaijiang_pipeline` 传 `project_facts_file` 即可自动完成同一步骤。

> 映射器只登记可追溯的实体、证据与截图；销量/GMV/渠道等**数值 fact** 仍由 Agent 核对原始抓取后写入（pipeline 表格列可能错位），并保留在 `gaps` 中提醒。

### 模块门禁

```bash
node scripts/project-facts.js gate \
  --file output/{project}-project-facts.json \
  --skill market-seo
```

返回含义：

| 结果 | 行为 |
|------|------|
| `passed=true` | 可进入该 skill 的分析与写作 |
| `BLOCKER` | 停止生成精确结论；先采集或向用户补问 |
| `WARNING` | 可继续，但报告必须披露缺口/假设 |

## 3. 数据分区

| 分区 | 内容 | 例子 |
|------|------|------|
| `project` | 全模块共用的项目上下文 | 品牌、产品、市场、受众、目标、预算、周期 |
| `inputs` | 用户给定输入 | 官网、Amazon/TTS 链接、材料路径 |
| `entities` | 被研究对象 | 商品、店铺、竞品、达人、视频 |
| `evidence` | 可追溯的采集记录 | MCP、网页、用户材料、Playwright |
| `facts` | 从证据提取的原子事实 | 销量、GMV、渠道占比、价格、互动率 |
| `screenshots` | 页面视觉证据 | 店铺详情页、商品详情页 |
| `assumptions` | 有依据但未核实的假设 | 行业基准估算 |
| `gaps` | 已知数据缺口 | 缺达人关联、无 GA4 |
| `workflow` | 当前阶段与最近门禁结果 | intake/data_collection/analysis |

## 4. 证据等级

| `status` | 定义 | 报告写法 |
|----------|------|----------|
| `verified` | API、网页、用户原始材料直接返回 | “数据来源：…” |
| `estimated` | 有明确公式或行业基准 | “基于…估算，非实测” |
| `inferred` | Agent 根据多个信号推断 | “基于公开信息推断” |
| `unverified` | 尚未验证 | 不得作为精确结论；写入 gaps |

规则：

1. `verified` fact 必须引用至少一个 `evidence_id`。
2. 报告中的每个精确数字必须能回溯到 `facts[].evidence_ids`。
3. 截图只证明页面当时所展示的内容，不能替代结构化数值来源。
4. `estimated` 与 `inferred` 不得改写为官方事实。

## 5. 模块消费规则

### 诊断型

`market-audit`、`market-brand`、`market-seo`、`market-funnel`、`market-landing`

- 先读取 `project`、`inputs.urls` 和官网类 evidence。
- 没有 GA4/GSC/Lighthouse 等证据时，只做页面启发式诊断。
- 不得声称掌握真实流量、排名、转化率或 Core Web Vitals。

### 竞品型

`market-competitors`、`chuhaijiang-data`

- 竞品集合写入 `entities.competitors`，默认至少 2 家。
- 每个核心指标写成独立 fact，并关联对应 MCP evidence。
- 商品相似关系、店铺、达人、视频分别保留实体引用。
- Playwright 截图写入 `screenshots`，不得只把截图路径塞进正文。

### 内容生成型

`market-copy`、`market-emails`、`market-social`、`market-ads`

- 只消费通过 gate 的品牌、产品、受众、目标和渠道事实。
- 文案创意可以生成；预算、转化率、ROAS 等数字不可凭空生成。
- 需要平台执行时明确标记“策划输出”，除非已连接对应发布/广告 API。

### 策略与提案型

`market-launch`、`market-proposal`、TTS/Amazon 系列

- 先消费上游诊断、竞品与用户目标，不重复创造另一套事实。
- 报价与 KPI 必须区分：用户目标、平台实测、公式估算。
- TTS gate 未满足竞品、销售/GMV、渠道/销售方式与截图要求时，不得进入最终交付。

## 6. 出海匠竞品标准链路

```text
search(products, keyword)
→ 用户或规则确认目标商品
→ get_related(products, similar)
→ 每个竞品 get_detail(products)
→ 店铺 get_detail(sellers)
→ get_related(products/sellers, creators/videos/products)
→ 写入 Project Facts
→ Playwright 截取已选店铺/商品详情页
→ validate + gate
→ AI 分析
```

API 结构化数据是数值来源；Playwright 截图是视觉证据，两者必须保留各自的 evidence。

## 7. 外部平台能力边界

Project Facts 可以接收未来的 GA4、Search Console、广告账户、社媒发布与 CRM 数据，但“预留字段”不等于“已经接入”：

- 未接 GA4/GSC：SEO/CRO 仅做公开页面诊断。
- 未接广告账户：`market-ads` 仅输出 Campaign 与创意方案。
- 未接社媒账号：`market-social` 仅输出内容日历，不声称已发布。
- 未接持续数据回流：报告不是自动优化闭环。

#!/usr/bin/env node
/**
 * 合并出海匠 Agent 多轮回复为单一交付 Markdown
 * 用法: node scripts/merge-chuhaijiang-reports.js --session ktc_gumi_launch --out output/KTC-闺蜜机全案完整版-2026-07-10.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SESSIONS = path.join(ROOT, 'output', 'chuhaijiang-agent-sessions.json');

function parseArgs() {
  const args = process.argv.slice(2);
  let sessionKey = '';
  let out = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--session' && args[i + 1]) sessionKey = args[++i];
    else if (args[i] === '--out' && args[i + 1]) out = args[++i];
  }
  if (!sessionKey || !out) {
    console.error('用法: node scripts/merge-chuhaijiang-reports.js --session ktc_gumi_launch --out output/xxx.md');
    process.exit(1);
  }
  return { sessionKey, out: path.resolve(ROOT, out) };
}

function readMdSection(filePath, fromHeading) {
  const full = path.join(ROOT, filePath);
  if (!fs.existsSync(full)) return '';
  const text = fs.readFileSync(full, 'utf-8');
  const idx = text.indexOf(fromHeading);
  if (idx < 0) return text;
  let body = text.slice(idx);
  const cut = body.indexOf('\n---\n\n## 截图');
  if (cut >= 0) body = body.slice(0, cut);
  return body.trim();
}

function escapeCell(cell) {
  return String(cell || '')
    .replace(/\|/g, '、')
    .replace(/\n/g, ' ')
    .trim();
}

function tabsToMdTable(block) {
  const lines = block.split('\n').filter(l => l.trim() && !/^复制$/.test(l.trim()));
  if (lines.length < 2) return block;
  const rows = lines.map(l => l.split('\t').map(escapeCell));
  if (rows[0].length < 2) return block;
  const header = rows[0];
  const sep = header.map(() => '---');
  const body = rows.slice(1).map(r => {
    while (r.length < header.length) r.push('');
    return r.slice(0, header.length);
  });
  const md = [
    `| ${header.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...body.map(r => `| ${r.join(' | ')} |`)
  ];
  return md.join('\n');
}

function fixCorruptedTableLine(line) {
  if (!line.includes('\t') && !/^\d+\s*\|/.test(line)) return line;
  let s = line.trim();
  s = s.replace(/^(\d+)\s*\|\s*/, '$1\t');
  s = s.replace(/\s*\\\s*\|\s*/g, ' · ');
  s = s.replace(/([a-zA-Z])\\?\s*\t/g, '$1 ·\t');
  if (s.includes('\t')) {
    const parts = s.split('\t');
    parts[0] = parts[0].replace(/\s*\|\s*/g, '').trim();
    if (parts.length > 1) {
      parts[1] = parts[1].replace(/\s*\|\s*/g, ' · ').trim();
    }
    s = parts.join('\t');
  }
  return s;
}

function fixBrokenMdTableRows(text) {
  return text
    .split('\n')
    .map(line => {
      if (!/^\s*\|/.test(line)) return line;
      return line
        .replace(/ \\ \| /g, ' · ')
        .replace(/\\\s*\|/g, ' · ')
        .replace(/\\/g, '');
    })
    .join('\n');
}

const PYRAMID_TABLE = `| 层级 | 定位 | 规模 | 核心作用 |
| --- | --- | --- | --- |
| 第一层 | 头/腰部大V | 少量 | 高曝光、强背书、破圈 |
| 第二层 | 腰部中V | 主力 | 高性价比、精准种草、垂类覆盖 |
| 第三层 | 微型/超微 KOL | 批量 | 口碑铺量、真实 UGC、长尾触达 |`;

function formatForFeishu(text) {
  let t = text;

  // 去掉 ASCII 框线图，换成标准表格
  t = t.replace(
    /[ \t]*[┌└┐┘│─┬┴├┤▼]+[\s\S]*?微型\/超微 KOL[\s\S]*?[┘┐][^\n]*/g,
    PYRAMID_TABLE
  );
  t = t.split('\n').filter(line => !/[┌└┐┘│─┬┴├┤▼]/.test(line)).join('\n');

  // 去掉对话噪声与重复摘要
  t = t
    .replace(/^## Agent 回复\s*/m, '')
    .replace(/^正在为您制定[\s\S]*?以上是完整的 KTC 闺蜜机美国全域宣发方案，核心要点总结：\s*/m, '')
    .replace(/^💰 预算逻辑[\s\S]*?🔗 引流闭环：[^\n]+\s*(?=KTC 闺蜜机|$)/m, '')
    .replace(/^已创建报告[^\n]+\s*/gm, '')
    .replace(/^KTC 闺蜜机新品美国全域社媒宣发方案[^\n]+\s*/m, '')
    .replace(/^品牌：KTC[^\n]+\s*/m, '');

  // 小节标题规范化（飞书可读）
  t = t.replace(/(^|\n)(\d+\.\d+)\s+([^\n|]+)/g, '\n\n### $2 $3\n');
  t = t.replace(/(^|\n)([一二三四五六七八]、[^\n|]+)/g, '\n\n### $2\n');

  // 平台段落标题
  t = t.replace(/(^|\n)(🎵|📸|▶️|👥)([^\n]+)/g, '\n\n#### $2$3\n');

  // 列表化内容方向
  t = t.replace(/内容方向：\s*\n/g, '\n\n**内容方向：**\n\n');
  t = t.replace(/(Hook型|场景型|对比型|测评型|美学型|教程型|联动型|Stories型|深度测评|对比测评|场景Vlog|教程类|关键词布局|账号标签|目标受众|引流重心)：/g, '\n- **$1：**');

  // 非表格正文与表格块之间留空行（表内行不插入）
  t = t.replace(/([^\n|])\n(\| [^|]+\|)/g, '$1\n\n$2');

  // 压缩空行
  t = fixBrokenMdTableRows(t);
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeAgentBody(raw) {
  let t = raw
    .replace(/\$\s*([\d,]+)/g, 'USD $1')
    .replace(/\$80,000/g, '80,000 USD')
    .replace(/\$52,000/g, '52,000 USD')
    .replace(/\$28,000/g, '28,000 USD')
    .replace(/\$52K/g, '52K USD')
    .replace(/\$28K/g, '28K USD')
    .replace(/^11:\d+\s*$/gm, '')
    .replace(/^社媒管家\s*$/gm, '')
    .replace(/^专家和知识库已就位\s*$/gm, '')
    .replace(/^<1s\s*$/gm, '')
    .replace(/^已搜索 \d+ 个工具\s*$/gm, '')
    .replace(/^[\d.]+s\s*$/gm, '')
    .replace(/^查看完整报告\s*$/gm, '')
    .replace(/^回到顶部\s*$/gm, '')
    .replace(/^复制\s*$/gm, '')
    .replace(/^结果\s*$/gm, '')
    .replace(/^01[\s\S]*?05[\s\S]*?调整预算分配比例或平台权重\s*$/m, '')
    .replace(/KTC 闺蜜机新品美国全域社媒宣发方案（\$80,000）\s*\d+\/\d+[\s\S]*?方案制定日期[\s\S]*?执行周期建议：8周\s*/g, '')
    .replace(/KTC 闺蜜机 · 美国全平台达人推荐 BD 名单\s*\d+\/\d+\s*\d+\s*$/gm, '');

  const blocks = t.split(/\n(?=[^\n]+\t[^\n]+)/);
  const out = [];
  let buf = [];
  for (const line of t.split('\n')) {
    const fixed = fixCorruptedTableLine(line);
    if (fixed.includes('\t') && fixed.split('\t').length >= 2) {
      buf.push(fixed);
    } else {
      if (buf.length >= 2) {
        out.push(tabsToMdTable(buf.join('\n')));
        buf = [];
      } else if (buf.length) {
        out.push(buf.join('\n'));
        buf = [];
      }
      out.push(line);
    }
  }
  if (buf.length >= 2) out.push(tabsToMdTable(buf.join('\n')));
  else if (buf.length) out.push(buf.join('\n'));

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function splitLargeTables(text, maxRows = 12) {
  return text.replace(/(\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)+)/g, table => {
    const lines = table.trim().split('\n');
    if (lines.length <= maxRows + 2) return table;
    const header = lines.slice(0, 2);
    const rows = lines.slice(2);
    const parts = [];
    for (let i = 0; i < rows.length; i += maxRows) {
      parts.push([...header, ...rows.slice(i, i + maxRows)].join('\n'));
    }
    return parts.join('\n\n');
  });
}

function addCreatorSubheadings(text) {
  return text
    .replace(/(^|\n)(一、🎵 TikTok[^\n]*)/g, '\n\n### $2')
    .replace(/(^|\n)(二、📸 Instagram[^\n]*)/g, '\n\n### $2')
    .replace(/(^|\n)(三、▶️ YouTube[^\n]*)/g, '\n\n### $2')
    .replace(/(^|\n)(四、👥 Facebook[^\n]*)/g, '\n\n### $2')
    .replace(/(^|\n)(五、全平台达人推荐总表[^\n]*)/g, '\n\n### $2')
    .replace(/(^|\n)(六、优先级 BD 推进建议[^\n]*)/g, '\n\n### $2');
}

function addPlanSubheadings(text) {
  return text
    .replace(/(^|\n)(一、策略总览)/g, '\n\n### $2')
    .replace(/(^|\n)(二、预算)/g, '\n\n### $2')
    .replace(/(^|\n)(三、KOL)/g, '\n\n### $2')
    .replace(/(^|\n)(四、PR)/g, '\n\n### $2')
    .replace(/(^|\n)(五、宣发节奏)/g, '\n\n### $2')
    .replace(/(^|\n)(六、双链引流)/g, '\n\n### $2')
    .replace(/(^|\n)(七、方案总结)/g, '\n\n### $2');
}

function extractPlanSummary(raw) {
  const m = raw.match(/💰[\s\S]*?🔗[\s\S]*?(?=\n\nKTC)/);
  return m ? m[0].trim() : '';
}

function main() {
  const { sessionKey, out } = parseArgs();
  const sessions = JSON.parse(fs.readFileSync(SESSIONS, 'utf-8'));
  const s = sessions[sessionKey];
  if (!s) {
    console.error('未找到 session:', sessionKey);
    process.exit(1);
  }

  const planRaw = readMdSection(s.replyMd, '## Agent 回复');
  const creatorsRaw = readMdSection(s.lastFollowUp?.replyMd || '', '## Agent 回复');
  const summary = extractPlanSummary(planRaw);
  const planBody = formatForFeishu(splitLargeTables(addPlanSubheadings(normalizeAgentBody(planRaw))));
  const creatorsBody = formatForFeishu(splitLargeTables(addCreatorSubheadings(normalizeAgentBody(creatorsRaw))));
  const date = new Date().toISOString().slice(0, 10);

  const md = `# KTC 闺蜜机 · 美国宣发全案（完整版）

> **策划方**：Vidau · **日期**：${date}  
> **出海匠对话**：${s.chatUrl}  
> **会话 key**：\`${sessionKey}\`

---

## ❗【核心结论】

> 以下 5 条为决策摘要；完整方案与达人表见后文。

---

### 结论 1｜预算：KOL 主攻转化，PR 建背书

**结论**

总预算 8 万 USD：KOL 约 65%（52,000 USD）、PR 约 35%（28,000 USD）。

**论证闭环**

出海匠社媒管家方案：KOL 驱动可量化转化，PR 建立专业背书与 SEO 长尾。

---

### 结论 2｜平台重心 TikTok，YouTube 做长尾

**结论**

KOL 平台分配：TikTok 40%、Instagram 30%、YouTube 20%、Facebook 10%；红人总规模约 69 人。

**论证闭环**

年轻女性基盘与算法放大效应在 TikTok 最强；YouTube 承接搜索与亚马逊站外 SEO。

---

### 结论 3｜BD 优先投影仪验证型达人

**结论**

第一优先级：@tntdealss、@cour10y、@tetenkeke、@iamaunusti。

**论证闭环**

出海匠数据库显示竞品投影仪视频播放量达千万级，迁移成本低、受众已验证。

---

### 结论 4｜16 位达人含公开 BD 邮箱

**结论**

TikTok 17 人全部来自出海匠数据库；全平台共 44 位 BD 候选人，16 人可直接邮件联系。

**论证闭环**

名单含 @handle、报价区间、亚马逊/独立站引流标注与联系方式。

---

### 结论 5｜双链引流闭环

**结论**

亚马逊：视频描述栏 / 橱窗 / YouTube 卡片；独立站：专属折扣码（如 BESTIE20）+ FB 社群 + 播客口播。

**论证闭环**

与出海匠方案第六节引流链路设计一致。

---

## 一、出海匠方案要点（摘要）

${summary || '（见下文完整方案）'}

*数据来源：出海匠社媒管家 Agent，${date}。*

---

## 二、出海匠宣发全案（完整）

${planBody}

*数据来源：出海匠社媒管家 Agent 首轮对话，${date}。*

---

## 三、出海匠达人 BD 推荐名单（完整）

### 3.1 名单亮点

- **投影仪爆款验证者**：@tntdealss（播放约 7490 万）、@cour10y（约 2390 万）
- **高互动率**：@iamaunusti 8.82%、@thefighome 6.88%、@jahjosephh 6.47%
- **16 位达人含 BD 邮箱**，可直接启动联系

### 3.2 完整名单与总表

${creatorsBody}

*数据来源：出海匠达人数据库对话续聊，${date}；IG/YT/FB 部分为跨平台延伸或行业补充，表中已注明。*

---

## 四、BD 推进优先级（执行清单）

| 优先级 | @handle | 理由 |
|--------|---------|------|
| P0 | @tntdealss | 投影仪爆款 7490 万播放，Magcubic 合作经验 |
| P0 | @cour10y | 竞品投影仪 2390 万播放，妈妈受众信任度高 |
| P0 | @tetenkeke | 姐妹题材 100% 匹配，互动率 5.43% |
| P0 | @iamaunusti | 互动率 8.82%，女性受众 90.6% |
| P1 | @ayannasabrina | TTS Star，三平台联投 |
| P1 | @vik.usa6 | Amazon storefront 直挂 |
| P1 | @thefighome | 互动率 6.88%，MCN 代理 |
| P1 | @slyinspireme | Amazon Finds 专业达人 |

---

## 五、数据来源汇总

| 数据块 | 来源 | 本地文件 |
|--------|------|----------|
| 宣发全案 | 出海匠 Agent 首轮 | ${s.replyMd} |
| 达人 BD 名单 | 出海匠 Agent 续聊 | ${s.lastFollowUp?.replyMd || '—'} |
| 会话索引 | 本地 | output/chuhaijiang-agent-sessions.json |
| 截图 | Playwright | ${s.screenshot} / ${s.lastFollowUp?.screenshot || '—'} |

---

*对外交付署名 Vidau · 本报告由双轨流程自动生成合并*
`;

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md, 'utf-8');
  console.log('✅ 已合并:', out);
  console.log('   字数约:', md.length);
}

main();

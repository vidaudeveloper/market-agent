#!/usr/bin/env node
/**
 * 向飞书文档按需插入图表（Markdown 驱动 / JSON 配置）
 *
 * 用法:
 *   node scripts/feishu-insert-charts.js --doc <documentId> --markdown output/report.md
 *   node scripts/feishu-insert-charts.js --doc <documentId> --config templates/charts.example.json
 *   node scripts/feishu-insert-charts.js --doc <documentId> --markdown report.md --refresh
 *   node scripts/feishu-insert-charts.js --markdown report.md --generate-only
 */

const fs = require('fs');
const path = require('path');
const { generateChart, buildChartConfig } = require('./chart-gen');
const {
  generateChartsFromMarkdown,
  chartsFromConfig,
  generateOneChart
} = require('./chart-markdown');
const CHARTS_DIR = path.join(__dirname, '..', 'output', 'charts');
const {
  loadEnv,
  getValidUserAccessToken,
  ensureDocumentEditable,
  insertChartsIntoDocument,
  replaceImageInBlock,
  listDocumentTableBlocks,
  attachChartsToTableBlocks
} = require('./feishu-lib');


function parseArgs(argv) {
  const args = {
    doc: null,
    markdown: null,
    config: null,
    fallbackAi: true,
    refresh: false,
    generateOnly: false,
    aiOnly: false
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--doc' && argv[i + 1]) args.doc = argv[++i];
    else if (a === '--markdown' && argv[i + 1]) args.markdown = argv[++i];
    else if (a === '--config' && argv[i + 1]) args.config = argv[++i];
    else if (a === '--fallback-ai') args.fallbackAi = true;
    else if (a === '--no-ai-fallback') args.fallbackAi = false;
    else if (a === '--ai-only') args.aiOnly = true;
    else if (a === '--refresh') args.refresh = true;
    else if (a === '--generate-only') args.generateOnly = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }

  return args;
}

async function generateFromConfigEntry(entry, options) {
  const outPath = path.join(CHARTS_DIR, entry.output || `${entry.title || 'chart'}.png`);
  if (!fs.existsSync(CHARTS_DIR)) fs.mkdirSync(CHARTS_DIR, { recursive: true });

  if (entry.chart) {
    const chartConfig = buildChartConfig({ forFeishu: true, ...entry.chart });
    const { path: savedPath, width, height } = await generateChart(chartConfig, outPath);
    return { ...entry, path: savedPath, width, height };
  }

  if (entry.table) {
    const chart = await generateOneChart(entry.table, options);
    return { ...entry, ...chart };
  }

  throw new Error(`配置项缺少 chart 或 table: ${entry.title || '未命名'}`);
}

async function loadChartPlan(args) {
  const genOptions = {
    fallbackAi: args.fallbackAi,
    engine: args.aiOnly ? 'ai' : 'quickchart'
  };

  if (args.config) {
    const entries = chartsFromConfig(args.config);
    const charts = [];
    for (const entry of entries) {
      charts.push(await generateFromConfigEntry(entry, genOptions));
    }
    return charts;
  }

  if (!args.markdown) {
    throw new Error('请指定 --markdown <文件> 或 --config <json>');
  }

  const markdown = fs.readFileSync(path.resolve(args.markdown), 'utf-8');
  const { charts } = await generateChartsFromMarkdown(markdown, genOptions);
  return charts;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`用法:
  node scripts/feishu-insert-charts.js --markdown output/report.md [--generate-only]
  node scripts/feishu-insert-charts.js --doc <documentId> --markdown output/report.md
  node scripts/feishu-insert-charts.js --doc <documentId> --config templates/charts.example.json
  node scripts/feishu-insert-charts.js --doc <documentId> --markdown report.md --refresh

选项:
  --generate-only     仅生成 PNG，不写入飞书
  --refresh           替换已有 imageBlockId（config 中配置）
  --ai-only           强制 AI 生图
  --no-ai-fallback    QuickChart 失败时不回退 AI`);
    process.exit(0);
  }

  const charts = await loadChartPlan(args);
  if (!charts.length) {
    console.log('未找到可生成的图表。请在 Markdown 表格前添加 <!-- chart --> 标记。');
    process.exit(0);
  }

  console.log(`\n📊 已生成 ${charts.length} 张图表\n`);
  charts.forEach(c => console.log(`   • ${c.title} → ${c.path}`));

  if (args.generateOnly || !args.doc) {
    if (!args.doc) console.log('\n（未指定 --doc，跳过飞书插入）');
    return;
  }

  const env = loadEnv();
  const token = await getValidUserAccessToken(env);

  if (args.refresh) {
    console.log('\n→ 替换已有图片块...');
    for (const chart of charts) {
      if (!chart.imageBlockId) {
        console.warn(`   ⚠ 跳过 ${chart.title}：config 中缺少 imageBlockId`);
        continue;
      }
      const result = await replaceImageInBlock(token, args.doc, chart.imageBlockId, chart.path);
      console.log(`   ✓ ${chart.title} → ${result.width}×${result.height}px`);
    }
  } else {
    let plan = charts;

    const needsTableMatch = plan.some(c => !c.afterBlockId && c.tableIndex !== undefined);
    if (needsTableMatch) {
      console.log('\n→ 扫描飞书文档表格位置...');
      const tableBlocks = await listDocumentTableBlocks(token, args.doc);
      console.log(`   找到 ${tableBlocks.length} 个表格`);
      plan = attachChartsToTableBlocks(plan, tableBlocks);
    }

    console.log('\n→ 插入飞书文档...');
    const inserted = await insertChartsIntoDocument(token, args.doc, plan);
    for (const item of inserted) {
      const pos = item.afterBlockId ? `表格后 ${item.afterBlockId.slice(-8)}` : '文档末尾';
      console.log(`   ✓ ${item.title} @ ${pos}`);
    }
  }

  console.log('\n→ 确保文档可编辑...');
  await ensureDocumentEditable(env, args.doc, { userAccessToken: token });
  console.log(`\n✅ 完成: https://gcn992geh8en.feishu.cn/docx/${args.doc}\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌', err.message || err);
    process.exit(1);
  });
}

module.exports = { loadChartPlan, parseArgs };

#!/usr/bin/env node
/**
 * 从 Markdown 表格按需生成图表（QuickChart 优先，AI 备选）
 *
 * 表格前加标记:
 *   <!-- chart -->           自动推断类型
 *   <!-- chart:bar -->       柱状图
 *   <!-- chart:line -->       折线图
 *   <!-- chart:radar -->      雷达图（多维度/多对象对比）
 *   <!-- chart:pie -->        饼图
 *   <!-- chart:doughnut -->   环形图
 *
 * 用法:
 *   node scripts/chart-markdown.js output/report.md
 *   node scripts/chart-markdown.js output/report.md --inject
 *   node scripts/chart-markdown.js output/report.md --ai-only
 */

const fs = require('fs');
const path = require('path');
const { generateChart, buildChartConfig } = require('./chart-gen');
const { loadEnv, slugify, generateImage, saveImageBuffer, ROOT } = require('./ai-lib');

const CHART_MARKER = /^<!--\s*chart(?::([\w-]+))?(?:\s+title=[^\s]+)?\s*-->$/i;
const VALID_CHART_TYPES = new Set(['bar', 'line', 'pie', 'doughnut', 'radar', 'auto']);

function parseRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());
}

function isSeparatorRow(cells) {
  return cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function parseNumericCell(value) {
  if (!value) return null;
  const v = String(value).trim();
  // 年龄区间如 18–34 岁 不应参与作图
  if (/\d+\s*[–\-~至]\s*\d+/.test(v)) return null;
  const cleaned = v.replace(/[,，%％$￥€£]/g, '').replace(/[^\d.-]/g, '');
  if (!cleaned || Number.isNaN(Number(cleaned))) return null;
  return Number(cleaned);
}

function cellLooksNumeric(value) {
  if (!value) return false;
  const v = String(value).trim();
  if (/\d+\s*[–\-~至]\s*\d+/.test(v)) return false;
  // 含中文说明文字的一律不当数值列（如特征、触达描述）
  if (/[\u4e00-\u9fff]/.test(v) && !/[%％]/.test(v)) return false;
  if (/[%％]/.test(v)) return parseNumericCell(v) !== null;
  if (/^USD\s+[\d,.\s]+$/i.test(v)) return parseNumericCell(v) !== null;
  if (!/^[\d,.\s+%％\-+]+$/.test(v)) return false;
  return parseNumericCell(v) !== null;
}

function pickShareColumn(headers, rows, numericCols) {
  for (const idx of numericCols) {
    if (/占比|份额|比例|percent|share|%/i.test(headers[idx] || '')) return idx;
  }
  for (const idx of numericCols) {
    if (looksLikeShareData(rows, idx)) return idx;
  }
  return numericCols[0];
}

function tableHasNumericData(headers, rows) {
  if (headers.length < 2 || rows.length === 0) return false;
  return headers.some((_, idx) => idx > 0 && rows.some(row => cellLooksNumeric(row[idx])));
}

function findNearestHeading(lines, startIndex) {
  for (let i = startIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) return heading[1].trim();
  }
  return null;
}

function normalizeChartType(raw) {
  const t = (raw || 'auto').toLowerCase();
  if (t === 'pie') return 'doughnut';
  if (VALID_CHART_TYPES.has(t)) return t;
  return 'auto';
}

function looksLikeTimeSeries(labels) {
  return labels.some(label =>
    /月|周|Q[1-4]|季度|day|week|month|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(label)
  );
}

function looksLikeShareData(rows, valueCol) {
  const values = rows.map(row => parseNumericCell(row[valueCol])).filter(v => v !== null);
  if (values.length < 2) return false;
  const hasPercent = rows.some(row => /%|％/.test(row[valueCol] || ''));
  const sum = values.reduce((a, b) => a + b, 0);
  return hasPercent || (sum >= 90 && sum <= 110);
}

function inferChartType(table) {
  const { headers, rows } = table;
  const numericCols = headers
    .map((_, idx) => idx)
    .filter(idx => idx > 0 && rows.some(row => cellLooksNumeric(row[idx])));

  const labels = rows.map(row => row[0]);

  if (numericCols.length >= 2 && rows.length >= 3) return 'radar';
  if (numericCols.length === 1 && looksLikeShareData(rows, numericCols[0])) return 'doughnut';
  if (numericCols.length === 1 && looksLikeTimeSeries(labels)) return 'line';
  return 'bar';
}

function parseMarkdownTables(markdown, options = {}) {
  const lines = markdown.split('\n');
  const tables = [];
  let markedTableIndex = 0;

  for (let i = 0; i < lines.length - 2; i++) {
    let chartType = 'auto';
    let tableStartLine = i;

    const markerMatch = lines[i].trim().match(CHART_MARKER);
    if (markerMatch) {
      chartType = normalizeChartType(markerMatch[1]);
      tableStartLine = i + 1;
      while (tableStartLine < lines.length && !lines[tableStartLine].trim()) {
        tableStartLine++;
      }
    } else if (!options.allTables) {
      continue;
    }

    const headerLine = lines[tableStartLine];
    const sepLine = lines[tableStartLine + 1];
    if (!headerLine || !headerLine.includes('|')) continue;
    if (!sepLine || !sepLine.includes('|')) continue;

    const headers = parseRow(headerLine);
    const sepCells = parseRow(sepLine);
    if (!isSeparatorRow(sepCells)) continue;

    const rows = [];
    let j = tableStartLine + 2;
    while (j < lines.length && lines[j].includes('|')) {
      rows.push(parseRow(lines[j]));
      j++;
    }
    if (rows.length === 0) continue;
    if (!tableHasNumericData(headers, rows)) continue;

    const explicitType = chartType === 'auto' ? null : chartType;
    const resolvedType = explicitType || inferChartType({ headers, rows });

    tables.push({
      title: findNearestHeading(lines, tableStartLine) || headers[0] || '数据图表',
      headers,
      rows,
      chartType: resolvedType,
      explicitType,
      tableStartLine,
      tableIndex: markedTableIndex,
      markerLine: markerMatch ? i : null
    });

    if (markerMatch) markedTableIndex++;
    i = j - 1;
  }

  return tables;
}

function isSummaryRow(label) {
  const cleaned = String(label || '').replace(/\*+/g, '').trim();
  return /^(合计|总计|total|sum)$/i.test(cleaned);
}

function filterChartRows(rows) {
  return rows.filter(row => !isSummaryRow(row[0]));
}

function tableToChartArgs(table) {
  const { headers, rows, chartType, explicitType, title } = table;
  let type = chartType === 'pie' ? 'doughnut' : chartType;

  const chartRows =
    type === 'line' || type === 'bar' ? filterChartRows(rows) : rows;
  const effectiveRows = chartRows.length ? chartRows : rows;

  const numericCols = headers
    .map((_, idx) => idx)
    .filter(idx => idx > 0 && effectiveRows.some(row => cellLooksNumeric(row[idx])));

  if (!numericCols.length) {
    throw new Error(`表格「${title}」未找到可绘制的数值列`);
  }

  const rowLabels = effectiveRows.map(row => row[0]).filter(Boolean);

  // 饼/环图只用一列占比，禁止多 dataset（否则 Chart.js 会画成内外双圈）
  if (type === 'doughnut' || type === 'pie') {
    const col = pickShareColumn(headers, effectiveRows, numericCols);
    const data = effectiveRows.map(row => parseNumericCell(row[col])).join(',');
    return {
      type,
      title,
      labels: rowLabels.join(','),
      data,
      forFeishu: true
    };
  }

  if (numericCols.length === 1) {
    const col = numericCols[0];
    const data = effectiveRows.map(row => parseNumericCell(row[col])).join(',');
    return {
      type,
      title,
      labels: rowLabels.join(','),
      data,
      forFeishu: true
    };
  }

  const dimensionLabels = rowLabels.join(',');
  const multi = numericCols.map(col => {
    const seriesName = headers[col] || `系列${col}`;
    const values = effectiveRows.map(row => parseNumericCell(row[col])).join(',');
    return `${seriesName}:${values}`;
  });

  let resolvedType = type;
  if (!explicitType && (resolvedType === 'doughnut' || resolvedType === 'bar')) {
    resolvedType = effectiveRows.length >= 3 ? 'radar' : 'bar';
  }

  return {
    type: resolvedType,
    title,
    labels: dimensionLabels,
    multi,
    forFeishu: true
  };
}

function buildAiChartPrompt(table) {
  const rowsText = table.rows
    .map(row => table.headers.map((h, idx) => `${h}: ${row[idx] || ''}`).join(', '))
    .join('\n');

  const chartLabel =
    table.chartType === 'doughnut' || table.chartType === 'pie'
      ? 'doughnut chart'
      : table.chartType === 'line'
        ? 'line chart'
        : table.chartType === 'radar'
          ? 'radar chart'
          : 'bar chart';

  return [
    `Professional clean ${chartLabel} for a Chinese marketing analytics report.`,
    `Title: ${table.title}`,
    'Data (use exact numbers and Chinese labels):',
    rowsText,
    'Style: white background, modern business infographic, clear Chinese labels, no watermark, tight layout, minimal padding.'
  ].join('\n');
}

function stripChartMarkers(markdown) {
  return markdown
    .split('\n')
    .filter(line => !CHART_MARKER.test(line.trim()))
    .join('\n');
}

async function generateOneChart(table, options = {}) {
  const env = loadEnv();
  const outDir = path.resolve(options.outDir || path.join(ROOT, 'output', 'charts'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = options.timestamp || new Date().toISOString().slice(0, 10);
  const slug = slugify(table.title);
  const fileName = options.fileName || `${slug}-${timestamp}-${table.tableIndex + 1}.png`;
  const filePath = path.join(outDir, fileName);

  const chartArgs = tableToChartArgs(table);
  const engine = options.engine || 'quickchart';
  const fallbackAi = options.fallbackAi !== false;

  if (engine !== 'ai') {
    try {
      const chartConfig = buildChartConfig(chartArgs);
      const { path: savedPath, width, height } = await generateChart(chartConfig, filePath);
      return {
        title: table.title,
        chartType: chartArgs.type,
        path: savedPath,
        relativePath: path.relative(ROOT, savedPath).replace(/\\/g, '/'),
        tableStartLine: table.tableStartLine,
        tableIndex: table.tableIndex,
        width,
        height,
        engine: 'quickchart'
      };
    } catch (err) {
      if (!fallbackAi || engine === 'quickchart-only') throw err;
      console.warn(`   QuickChart 失败，改用 AI: ${err.message}`);
    }
  }

  const prompt = buildAiChartPrompt(table);
  const result = await generateImage(prompt, env, options);
  saveImageBuffer(result.buffer, filePath);

  return {
    title: table.title,
    chartType: table.chartType,
    path: filePath,
    relativePath: path.relative(ROOT, filePath).replace(/\\/g, '/'),
    tableStartLine: table.tableStartLine,
    tableIndex: table.tableIndex,
    engine: 'ai'
  };
}

async function generateChartsFromMarkdown(markdown, options = {}) {
  const tables = parseMarkdownTables(markdown, options);
  if (!tables.length) {
    return { charts: [], markdown: stripChartMarkers(markdown), tables: [] };
  }

  const charts = [];
  for (let idx = 0; idx < tables.length; idx++) {
    const table = tables[idx];
    console.log(`📊 生成图表 (${idx + 1}/${tables.length}): ${table.title} [${table.chartType}]`);
    const chart = await generateOneChart(table, options);
    charts.push(chart);
    console.log(`   ✓ ${chart.path} (${chart.engine})`);
  }

  return { charts, markdown: stripChartMarkers(markdown), tables };
}

function injectChartImages(markdown, charts) {
  if (!charts.length) return markdown;
  const lines = markdown.split('\n');
  const insertions = new Map();

  for (const chart of charts) {
    let insertAt = chart.tableStartLine + 1;
    while (insertAt < lines.length && lines[insertAt].includes('|')) insertAt++;
    const engineLabel = chart.engine === 'ai' ? process.env.AI_IMAGE_MODEL || 'gpt-image-2' : 'QuickChart';
    const block = [
      '',
      `![${chart.title}](${chart.relativePath})`,
      `*图表：${chart.title}；由 ${engineLabel} 基于上方表格数据生成。*`,
      ''
    ];
    insertions.set(insertAt, (insertions.get(insertAt) || []).concat(block));
  }

  const output = [];
  for (let i = 0; i < lines.length; i++) {
    output.push(lines[i]);
    if (insertions.has(i + 1)) output.push(...insertions.get(i + 1));
  }
  return output.join('\n');
}

function chartsFromConfig(configPath) {
  const resolved = path.resolve(configPath);
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  return Array.isArray(raw) ? raw : raw.charts || [];
}

module.exports = {
  CHART_MARKER,
  VALID_CHART_TYPES,
  parseMarkdownTables,
  tableToChartArgs,
  inferChartType,
  generateOneChart,
  generateChartsFromMarkdown,
  stripChartMarkers,
  injectChartImages,
  chartsFromConfig,
  buildAiChartPrompt
};

if (require.main === module) {
  (async () => {
    const argv = process.argv.slice(2);
    const flags = new Set(argv.filter(a => a.startsWith('--')));
    const args = argv.filter(a => !a.startsWith('--'));

    if (!args[0]) {
      console.log('用法:');
      console.log('  node scripts/chart-markdown.js <markdown文件> [--inject] [--all-tables]');
      console.log('  node scripts/chart-markdown.js <markdown文件> --ai-only');
      console.log('');
      console.log('标记: <!-- chart --> | <!-- chart:bar|line|radar|pie|doughnut -->');
      process.exit(0);
    }

    const filePath = path.resolve(args[0]);
    if (!fs.existsSync(filePath)) {
      console.error('文件不存在:', filePath);
      process.exit(1);
    }

    const markdown = fs.readFileSync(filePath, 'utf-8');
    const { charts, markdown: cleaned } = await generateChartsFromMarkdown(markdown, {
      allTables: flags.has('--all-tables'),
      engine: flags.has('--ai-only') ? 'ai' : 'quickchart',
      fallbackAi: !flags.has('--no-ai-fallback')
    });

    if (!charts.length) {
      console.log('未找到可生成图表的表格。请在表格前添加 <!-- chart --> 或使用 --all-tables');
      process.exit(0);
    }

    if (flags.has('--inject')) {
      fs.writeFileSync(filePath, injectChartImages(cleaned, charts), 'utf-8');
      console.log(`\n✅ 已写入 ${charts.length} 个图表引用到 ${filePath}`);
    } else {
      console.log(`\n✅ 共生成 ${charts.length} 张图表`);
    }
  })().catch(err => {
    console.error('图表生成失败:', err.message);
    process.exit(1);
  });
}

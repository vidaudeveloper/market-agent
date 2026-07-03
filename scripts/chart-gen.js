#!/usr/bin/env node
/**
 * 数据图表生成器（基于 QuickChart，非 AI）
 *
 * 用法:
 *   node scripts/chart-gen.js --type bar --title "渠道GMV" --labels "抖音,天猫,亚马逊" --data "1050,1380,720"
 *   node scripts/chart-gen.js --type radar --title "竞品雷达" --labels "SEO,内容,社媒,广告,品牌,转化" --data "80,65,70,85,60,75" --dataset-label "竞品A"
 *   node scripts/chart-gen.js --type radar --title "竞品雷达" --labels "SEO,内容,社媒" --multi "竞品A:80,65,70" "竞品B:70,80,60"
 *   node scripts/chart-gen.js --config chart-config.json
 *   node scripts/chart-gen.js --preset competitor-radar --data "80,65,70,85,60,75"
 *   node scripts/chart-gen.js --preset channel-bar --data "1050,1380,720,580"
 *   node scripts/chart-gen.js --preset funnel-bar --data "10000,5000,2000,500"
 *
 * 输出: output/charts/<标题>.png
 */

const fs = require('fs');
const path = require('path');
const QuickChart = require('quickchart-js');

const ROOT = path.join(__dirname, '..');
const CHARTS_DIR = path.join(ROOT, 'output', 'charts');

function ensureChartsDir() {
  if (!fs.existsSync(CHARTS_DIR)) fs.mkdirSync(CHARTS_DIR, { recursive: true });
}

// ─── 配色方案（营销报告风格）─────────────────────────────
const PALETTE = {
  primary:   ['#D85A30', '#534AB7', '#0F6E56', '#378ADD', '#BA7517', '#D4537E'],
  fill:      ['rgba(216,90,48,0.25)', 'rgba(83,74,183,0.25)', 'rgba(15,110,86,0.25)', 'rgba(55,138,221,0.25)', 'rgba(186,117,23,0.25)', 'rgba(212,83,126,0.25)'],
  red:       '#D85A30',
  green:     '#0F6E56',
  blue:      '#378ADD',
  gray:      '#888780'
};

// ─── 营销预设模板 ───────────────────────────────────────
const PRESETS = {
  'competitor-radar': {
    type: 'radar',
    defaultLabels: ['SEO', '内容营销', '社交媒体', '付费广告', '品牌影响力', '转化率'],
    options: {
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20, font: { size: 11 } },
          pointLabels: { font: { size: 12 } },
          grid: { color: 'rgba(136,135,128,0.3)' }
        }
      },
      plugins: { legend: { position: 'bottom', labels: { font: { size: 12 } } } }
    }
  },
  'channel-bar': {
    type: 'bar',
    defaultLabels: ['抖音', '天猫', '亚马逊', '独立站'],
    options: {
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: 'rgba(136,135,128,0.2)' } },
        x: { ticks: { font: { size: 12 } }, grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  },
  'funnel-bar': {
    type: 'bar',
    defaultLabels: ['访客', '注册', '下单', '复购'],
    options: {
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(136,135,128,0.2)' } },
        y: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  },
  'seo-line': {
    type: 'line',
    defaultLabels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    options: {
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(136,135,128,0.2)' } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { position: 'bottom' } },
      elements: { line: { tension: 0.3 }, point: { radius: 4 } }
    }
  },
  'share-pie': {
    type: 'doughnut',
    defaultLabels: ['抖音', '天猫', '亚马逊', '独立站', '其他'],
    options: {
      plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } },
      cutout: '55%'
    }
  }
};

// 飞书嵌入推荐尺寸（紧凑、少留白）
const CHART_SIZES = {
  radar: { width: 680, height: 680 },
  doughnut: { width: 680, height: 400 },
  pie: { width: 680, height: 400 },
  bar: { width: 680, height: 360 },
  line: { width: 680, height: 340 },
  default: { width: 680, height: 420 }
};

function resolveChartSize(type, overrides = {}) {
  const base = CHART_SIZES[type] || CHART_SIZES.default;
  return {
    width: overrides.width ? parseInt(overrides.width, 10) : base.width,
    height: overrides.height ? parseInt(overrides.height, 10) : base.height
  };
}

function applyFeishuLayout(type, options, args = {}) {
  options.layout = {
    padding: { top: 6, right: 10, bottom: 6, left: 10 }
  };
  options.maintainAspectRatio = true;

  if (!options.plugins) options.plugins = {};
  if (args.forFeishu || args.hideTitle) {
    if (options.plugins.title) options.plugins.title.display = false;
  }
  if (options.plugins.legend) {
    options.plugins.legend.labels = {
      ...options.plugins.legend.labels,
      boxWidth: 12,
      padding: 10,
      font: { size: 11 }
    };
  }

  if (type === 'radar') {
    options.scales = options.scales || {};
    options.scales.r = {
      beginAtZero: true,
      max: 100,
      ticks: { stepSize: 20, font: { size: 10 }, backdropColor: 'transparent' },
      pointLabels: { font: { size: 11 } },
      grid: { color: 'rgba(136,135,128,0.3)' },
      ...options.scales.r
    };
    options.plugins.legend = {
      position: 'bottom',
      labels: { boxWidth: 12, padding: 8, font: { size: 11 } }
    };
  } else if (type === 'bar' || type === 'line') {
    options.scales = options.scales || {};
    if (options.scales.y) {
      options.scales.y.ticks = { ...options.scales.y.ticks, maxTicksLimit: 6 };
    }
    if (type === 'bar' && !options.scales.x?.ticks) {
      options.scales.x = { ...options.scales.x, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 0 } };
    }
  } else if (type === 'doughnut' || type === 'pie') {
    options.plugins.legend = {
      position: 'right',
      labels: { boxWidth: 12, padding: 8, font: { size: 11 } }
    };
  }

  return options;
}

/** 多系列量级差 >15 倍时启用双 Y 轴（如 GMV 与订单数同图） */
function needsDualAxis(type, datasets) {
  if (type !== 'line' || datasets.length < 2) return false;
  const maxes = datasets.map(d =>
    Math.max(...(d.data || []).filter(n => typeof n === 'number' && !Number.isNaN(n)), 0)
  );
  const positive = maxes.filter(m => m > 0);
  if (positive.length < 2) return false;
  const ratio = Math.max(...positive) / Math.min(...positive);
  return ratio >= 15;
}

function applyDualAxis(type, datasets, options) {
  if (!needsDualAxis(type, datasets)) return;

  // QuickChart 默认 Chart.js v2：双轴须用 yAxes + y-axis-N
  const ids = datasets.map((_, i) => `y-axis-${i}`);
  datasets.forEach((ds, i) => {
    ds.yAxisID = ids[i];
  });

  if (options.scales) {
    delete options.scales.y;
    delete options.scales.y1;
  }

  options.scales = options.scales || {};
  options.scales.yAxes = ids.map((id, i) => ({
    id,
    type: 'linear',
    position: i === 0 ? 'left' : 'right',
    scaleLabel: { display: true, labelString: datasets[i]?.label || '' },
    ticks: { beginAtZero: true, maxTicksLimit: 6, fontSize: 10 },
    gridLines:
      i === 0
        ? { color: 'rgba(136,135,128,0.2)' }
        : { drawOnChartArea: false, color: 'rgba(136,135,128,0.15)' }
  }));
}

/** 双轴折线若形状高度相关（如 GMV vs 订单），改为柱+线组合避免两线重合 */
function applyComboBarLine(type, datasets, options) {
  if (type !== 'line' || datasets.length < 2) return false;
  if (!needsDualAxis(type, datasets)) return false;

  datasets[0].type = 'bar';
  datasets[0].fill = true;
  datasets[0].borderWidth = 0;

  for (let i = 1; i < datasets.length; i++) {
    datasets[i].type = 'line';
    datasets[i].fill = false;
    datasets[i].borderWidth = 3;
    datasets[i].pointRadius = 4;
    datasets[i].pointHoverRadius = 5;
    datasets[i].lineTension = 0.25;
    datasets[i].backgroundColor = 'transparent';
  }

  options.elements = options.elements || {};
  options.elements.line = { tension: 0.25 };
  options.elements.point = { radius: 4, hoverRadius: 5 };

  return true;
}

function buildDatasets(type, labels, args) {
  const multi = args.multi || [];
  const datasetLabel = args.datasetLabel || args['dataset-label'] || '';
  const rawData = args.data || '';

  if (multi.length > 0) {
    // 多数据集模式: --multi "竞品A:80,65,70" "竞品B:70,80,60"
    return multi.map((entry, i) => {
      const [name, values] = entry.split(':');
      const data = values.split(',').map(Number);
      const color = PALETTE.primary[i % PALETTE.primary.length];
      const fillColor = PALETTE.fill[i % PALETTE.fill.length];

      const dataset = { label: name, data, borderWidth: 2 };
      if (type === 'radar') {
        dataset.borderColor = color;
        dataset.backgroundColor = fillColor;
        dataset.pointBackgroundColor = color;
      } else if (type === 'bar' || type === 'line') {
        dataset.borderColor = color;
        dataset.backgroundColor = type === 'bar' ? color : fillColor;
        dataset.fill = type === 'line';
      } else if (type === 'pie' || type === 'doughnut') {
        dataset.backgroundColor = labels.map((_, j) => PALETTE.primary[j % PALETTE.primary.length]);
      }
      return dataset;
    });
  }

  // 单数据集模式
  const data = rawData.split(',').map(Number);
  const color = datasetLabel ? PALETTE.primary[0] : PALETTE.primary[0];
  const dataset = { label: datasetLabel, data, borderWidth: 2 };

  if (type === 'radar') {
    dataset.borderColor = color;
    dataset.backgroundColor = PALETTE.fill[0];
    dataset.pointBackgroundColor = color;
  } else if (type === 'bar') {
    dataset.backgroundColor = data.map((_, j) => PALETTE.primary[j % PALETTE.primary.length]);
    dataset.borderColor = data.map((_, j) => PALETTE.primary[j % PALETTE.primary.length]);
  } else if (type === 'line') {
    dataset.borderColor = color;
    dataset.backgroundColor = PALETTE.fill[0];
    dataset.fill = true;
  } else if (type === 'pie' || type === 'doughnut') {
    dataset.backgroundColor = data.map((_, j) => PALETTE.primary[j % PALETTE.primary.length]);
    dataset.borderColor = '#fff';
    dataset.borderWidth = 2;
  }

  return [dataset];
}

function buildChartConfig(args) {
  const presetName = args.preset;
  const preset = presetName ? PRESETS[presetName] : null;

  if (!presetName && !args.type) {
    throw new Error('请指定图表类型 (--type) 或预设模板 (--preset)');
  }

  const type = preset ? preset.type : (args.type || 'bar');
  const labelsRaw = args.labels || (preset ? preset.defaultLabels.join(',') : '');
  const labels = labelsRaw.split(',').map(s => s.trim());
  const datasets = buildDatasets(type, labels, args);
  const title = args.title || presetName || `chart-${Date.now()}`;

  const options = preset ? { ...preset.options } : {};
  if (!options.plugins) options.plugins = {};
  options.plugins.title = {
    display: !(args.forFeishu || args.hideTitle),
    text: title,
    font: { size: 14, weight: '500' },
    color: '#2C2C2A',
    padding: { bottom: 8 }
  };

  applyFeishuLayout(type, options, args);
  applyDualAxis(type, datasets, options);
  const useCombo = applyComboBarLine(type, datasets, options);
  const chartType = useCombo ? 'bar' : type;

  return {
    type: chartType,
    data: { labels, datasets },
    options,
    title
  };
}

// ─── 从 JSON 配置文件构建 ──────────────────────────────

function buildFromConfigFile(configPath) {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) throw new Error(`配置文件不存在: ${resolved}`);
  const config = JSON.parse(fs.readFileSync(resolved, 'utf-8'));

  // 补充默认选项
  if (!config.options) config.options = {};
  if (!config.options.plugins) config.options.plugins = {};
  if (!config.options.plugins.title) {
    config.options.plugins.title = {
      display: true,
      text: config.title || 'chart',
      font: { size: 14, weight: '500' },
      color: '#2C2C2A',
      padding: { bottom: 12 }
    };
  }

  return config;
}

// ─── 生成图表 PNG ──────────────────────────────────────

async function generateChart(chartConfig, outputPath, options = {}) {
  ensureChartsDir();

  const size = resolveChartSize(chartConfig.type, options);
  const width = size.width;
  const height = size.height;

  const chart = new QuickChart();
  chart.setWidth(width);
  chart.setHeight(height);
  chart.setConfig(chartConfig);
  chart.setBackgroundColor('#ffffff');

  const resolvedOutput = outputPath || path.join(CHARTS_DIR, `${chartConfig.title || 'chart'}.png`);
  await chart.toFile(resolvedOutput);

  return { path: resolvedOutput, width, height };
}

// ─── CLI 参数解析 ──────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  const multi = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--multi') {
      // --multi 可以接收多个值，直到下一个 -- 开头的参数
      i++;
      while (i < argv.length && !argv[i].startsWith('--')) {
        multi.push(argv[i]);
        i++;
      }
      args.multi = multi;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[key] = argv[i + 1];
        i += 2;
      } else {
        args[key] = true;
        i++;
      }
    } else {
      i++;
    }
  }

  return args;
}

// ─── 主流程 ────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.type && !args.preset && !args.config) {
    console.log('数据图表生成器（基于 QuickChart，非 AI）');
    console.log('');
    console.log('用法:');
  console.log('  node scripts/chart-gen.js --type bar --title "渠道GMV" --labels "抖音,天猫,亚马逊" --data "1050,1380,720"');
  console.log('  node scripts/chart-gen.js --type radar --title "竞品雷达" --labels "SEO,内容,社媒" --multi "竞品A:80,65,70" "竞品B:70,80,60"');
  console.log('  node scripts/chart-gen.js --preset competitor-radar --data "80,65,70,85,60,75"');
  console.log('  node scripts/chart-gen.js --preset channel-bar --data "1050,1380,720,580" --width 1200 --height 800');
  console.log('  node scripts/chart-gen.js --preset funnel-bar --data "10000,5000,2000,500"');
  console.log('  node scripts/chart-gen.js --preset share-pie --data "35,30,20,10,5"');
  console.log('  node scripts/chart-gen.js --config chart-config.json');
  console.log('');
  console.log('预设模板:');
  for (const [name, preset] of Object.entries(PRESETS)) {
    console.log(`  ${name} (${preset.type}) — 默认维度: ${preset.defaultLabels.join('/')}`);
  }
  console.log('');
  console.log('图表类型: bar | radar | line | pie | doughnut');
  console.log('输出目录: output/charts/');
  console.log('可选参数: --width <像素>  --height <像素>  (默认 1024x768)');
    process.exit(0);
  }

  let chartConfig;

  if (args.config) {
    chartConfig = buildFromConfigFile(args.config);
  } else {
    chartConfig = buildChartConfig(args);
  }

  console.log(`📊 正在生成图表: ${chartConfig.title || 'untitled'} (${chartConfig.type})`);
  const outputPath = args.output ? path.resolve(args.output) : undefined;
  const { path: resultPath } = await generateChart(chartConfig, outputPath, {
    width: args.width ? parseInt(args.width, 10) : undefined,
    height: args.height ? parseInt(args.height, 10) : undefined
  });

  const size = fs.statSync(resultPath).size;
  console.log(`✅ 图表已保存: ${resultPath} (${(size / 1024).toFixed(1)} KB)`);
  return resultPath;
}

// 同时导出 API 供其他脚本调用
module.exports = { generateChart, buildChartConfig, resolveChartSize, PRESETS, PALETTE, CHART_SIZES };

// 仅在直接运行时执行 CLI
if (require.main === module) {
  main().catch(err => {
    console.error('❌ 图表生成失败:', err.message);
    process.exit(1);
  });
}

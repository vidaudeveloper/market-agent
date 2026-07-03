#!/usr/bin/env node
/**
 * 兼容入口：商业数据表格 → 图表 PNG
 * 实际逻辑见 chart-markdown.js（QuickChart 优先，AI 备选）
 */

const {
  parseMarkdownTables,
  generateChartsFromMarkdown,
  stripChartMarkers,
  injectChartImages,
  buildAiChartPrompt
} = require('./chart-markdown');

module.exports = {
  parseMarkdownTables,
  generateChartsFromMarkdown,
  stripChartMarkers,
  injectChartImages,
  buildChartPrompt: buildAiChartPrompt
};

if (require.main === module) {
  require('./chart-markdown');
}

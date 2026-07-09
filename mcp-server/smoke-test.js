#!/usr/bin/env node
/**
 * MCP 冒烟测试（不启动 stdio，仅验证模块与授权状态）
 */
const path = require('path');

process.env.VIDAU_MARKET_ROOT = path.resolve(__dirname, '..');

const { getAuthStatus } = require('./lib/auth');
const { getRoot } = require('./lib/root');
const fs = require('fs');

function listReports(root, limit = 5) {
  const outputDir = path.join(root, 'output');
  if (!fs.existsSync(outputDir)) return [];
  return fs
    .readdirSync(outputDir)
    .filter(f => f.endsWith('.md'))
    .slice(0, limit);
}

const root = getRoot();
const status = getAuthStatus();
const reports = listReports(root);

console.log('✅ MCP 模块加载成功');
console.log('   根目录:', root);
console.log('   授权状态:', JSON.stringify(status, null, 2));
console.log('   报告样例:', reports.length ? reports.join(', ') : '(无)');
process.exit(0);

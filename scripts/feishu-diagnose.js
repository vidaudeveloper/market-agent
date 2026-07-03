#!/usr/bin/env node
/**
 * 飞书连接诊断
 *
 * 用法:
 *   node scripts/feishu-diagnose.js
 */

const {
  loadEnv,
  isFeishuConfigured,
  getFeishuAppId,
  getRedirectUri,
  getUserAuthStatus,
  USER_AUTH_FILE
} = require('./feishu-lib');

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function maskId(id) {
  if (!id || id.length < 12) return id || '(未配置)';
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function main() {
  console.log('');
  console.log('========================================');
  console.log('  Vidau Market Agent — 飞书诊断');
  console.log('========================================');
  console.log('');

  const envPath = path.join(ROOT, '.env');
  const hasEnv = fs.existsSync(envPath);
  console.log(`[1] 配置文件 .env: ${hasEnv ? '✅ 存在' : '❌ 缺失'}`);

  if (!hasEnv) {
    console.log('');
    console.log('→ 解决: copy .env.example .env，再按 FEISHU-APP-SETUP.md 填写飞书应用');
    process.exit(1);
  }

  const env = loadEnv();
  const configured = isFeishuConfigured(env);

  if (!configured) {
    console.log('[2] 飞书应用凭证: ❌ 未配置或无效');
    console.log('');
    console.log('→ 解决: 按 FEISHU-APP-SETUP.md 创建自建应用，填入 .env:');
    console.log('   FEISHU_APP_ID=cli_...');
    console.log('   FEISHU_APP_SECRET=...');
    process.exit(1);
  }

  const appId = getFeishuAppId(env);
  const redirect = getRedirectUri(env);
  console.log(`[2] 飞书应用 ID: ${maskId(appId)}`);
  console.log(`    完整 ID: ${appId}`);
  console.log(`    回调地址: ${redirect}`);

  const hasNodeModules = fs.existsSync(path.join(ROOT, 'node_modules'));
  console.log(`[3] 依赖 node_modules: ${hasNodeModules ? '✅' : '❌ 请先运行 setup.bat / npm install'}`);

  const status = getUserAuthStatus();
  console.log(`[4] 本机 OAuth 状态: ${status.connected ? '✅ 已连接' : '❌ 未连接'}`);
  if (status.connected) {
    if (status.name) console.log(`    用户: ${status.name}`);
    if (status.updated_at) console.log(`    最近授权: ${status.updated_at}`);
  }
  console.log(`    凭证文件: ${USER_AUTH_FILE}`);

  console.log('');
  console.log('授权页地址栏应包含: client_id=' + appId);
  console.log('若 client_id 不一致 → 勿用 Hermes 内置飞书，只用 feishu-connect.bat');
  console.log('');

  if (!status.connected) {
    console.log('→ 下一步: feishu-connect.bat（配置好 .env 后）');
  } else {
    console.log('→ 下一步: node scripts/feishu-export.js output/报告.md "标题" --charts');
  }

  console.log('');
  console.log('创建应用: FEISHU-APP-SETUP.md');
  console.log('用户指南: FEISHU-USER-GUIDE.md');
  console.log('');
}

main();

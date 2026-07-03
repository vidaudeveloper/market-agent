#!/usr/bin/env node
/**
 * 飞书连接诊断（普通用户 / 管理员）
 *
 * 用法:
 *   node scripts/feishu-diagnose.js
 */

const {
  loadEnv,
  getFeishuAppId,
  getRedirectUri,
  getUserAuthStatus,
  USER_AUTH_FILE
} = require('./feishu-lib');

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXPECTED_APP_PREFIX = 'cli_';

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
  console.log(`[1] 配置文件 .env: ${hasEnv ? '✅ 存在' : '❌ 缺失（请 git clone 完整仓库）'}`);

  let appId = '';
  try {
    const env = loadEnv();
    appId = getFeishuAppId(env);
    const redirect = getRedirectUri(env);
    console.log(`[2] 本仓库飞书应用 ID: ${maskId(appId)}`);
    console.log(`    完整 ID: ${appId}`);
    console.log(`    回调地址: ${redirect}`);
    if (!appId.startsWith(EXPECTED_APP_PREFIX)) {
      console.log('    ⚠️  App ID 格式异常，请检查 .env');
    }
  } catch (err) {
    console.log(`[2] 飞书应用: ❌ ${err.message}`);
    console.log('');
    console.log('→ 解决: 从 GitHub 重新 clone，或复制 .env.example 后联系管理员填入 FEISHU_APP_ID');
    process.exit(1);
  }

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
  console.log('========================================');
  console.log('  如何判断浏览器打开的是哪个应用？');
  console.log('========================================');
  console.log('');
  console.log('运行 feishu-connect 后，浏览器地址栏应包含：');
  console.log(`  client_id=${appId}`);
  console.log('');
  console.log('若地址栏 client_id 不是上面这个 ID → 你走错了（多半是 Hermes 内置飞书）');
  console.log('若 client_id 正确，但页面写「没有 agent飞书认证 使用权限」→ 飞书管理员未把你加入可用范围');
  console.log('');

  if (!status.connected) {
    console.log('→ 下一步: 双击 feishu-connect.bat（勿用 Hermes 飞书按钮）');
  } else {
    console.log('→ 下一步: node scripts/feishu-export.js output/报告.md "标题" --charts');
  }

  console.log('');
  console.log('管理员修复清单: FEISHU-ADMIN.md');
  console.log('用户图文指南: FEISHU-USER-GUIDE.md');
  console.log('');
}

main();

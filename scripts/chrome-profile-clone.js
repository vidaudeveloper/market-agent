#!/usr/bin/env node
/**
 * 克隆本机日常 Chrome 配置（去掉大缓存），供 Playwright 截图复用登录态。
 * 不会修改原 Chrome 配置；输出目录在 auth/ 下（已 gitignore）。
 *
 * 用法（先完全退出 Chrome）:
 *   node scripts/chrome-profile-clone.js
 *   node scripts/chrome-profile-clone.js --out auth/chrome-user-clone
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const outIdx = process.argv.indexOf('--out');
const OUT = path.resolve(
  ROOT,
  outIdx >= 0 ? process.argv[outIdx + 1] || 'auth/chrome-user-clone' : 'auth/chrome-user-clone'
);
const SRC = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');

function assertNoChrome() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('tasklist', ['/FI', 'IMAGENAME eq chrome.exe'], { encoding: 'utf8' });
      if (/chrome\.exe/i.test(out) && !/No tasks|没有运行/i.test(out)) {
        throw new Error('检测到 chrome.exe 仍在运行，请先完全退出 Chrome 再克隆');
      }
    }
  } catch (err) {
    if (err.message.includes('仍在运行')) throw err;
  }
}

function main() {
  if (!fs.existsSync(SRC)) throw new Error(`未找到 Chrome 用户目录: ${SRC}`);
  assertNoChrome();

  fs.mkdirSync(OUT, { recursive: true });
  const localState = path.join(SRC, 'Local State');
  if (fs.existsSync(localState)) {
    fs.copyFileSync(localState, path.join(OUT, 'Local State'));
  }

  const srcDefault = path.join(SRC, 'Default');
  const dstDefault = path.join(OUT, 'Default');
  if (!fs.existsSync(srcDefault)) throw new Error(`未找到 ${srcDefault}`);

  if (process.platform === 'win32') {
    // exit 0–7 对 robocopy 常表示成功或有文件复制
    try {
      execFileSync(
        'robocopy',
        [
          srcDefault,
          dstDefault,
          '/E',
          '/XD',
          'Cache',
          'Code Cache',
          'GPUCache',
          'Service Worker\\CacheStorage',
          'DawnCache',
          'optimization_guide_model_store',
          '/NFL',
          '/NDL',
          '/NJH',
          '/NJS',
          '/nc',
          '/ns',
          '/np'
        ],
        { stdio: 'inherit' }
      );
    } catch (err) {
      const code = err.status;
      if (typeof code === 'number' && code >= 8) throw err;
    }
  } else {
    execFileSync('rsync', ['-a', '--delete', '--exclude', 'Cache', '--exclude', 'Code Cache', `${srcDefault}/`, `${dstDefault}/`], {
      stdio: 'inherit'
    });
  }

  console.log('✅ 已克隆到:', path.relative(ROOT, OUT).replace(/\\/g, '/'));
  console.log('下一步:');
  console.log('  node scripts/competitor-screenshots-stealth.js --all --headed --profile auth/chrome-user-clone');
}

try {
  main();
} catch (err) {
  console.error('❌', err.message);
  process.exit(1);
}

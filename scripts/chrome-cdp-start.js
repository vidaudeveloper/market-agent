#!/usr/bin/env node
/**
 * 用日常 Chrome 配置启动远程调试端口，供 Playwright --cdp 挂接。
 *
 * 用法（先关掉所有 Chrome）:
 *   node scripts/chrome-cdp-start.js
 *   node scripts/chrome-cdp-start.js --port 9222
 */
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');

const portArg = process.argv.indexOf('--port');
const PORT = portArg >= 0 ? Number(process.argv[portArg + 1] || 9222) : 9222;

function findChrome() {
  const candidates = [
    path.join(process.env['ProgramFiles'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
  ];
  return candidates.find(p => p && fs.existsSync(p));
}

function waitCdp(port, tries = 40) {
  return new Promise((resolve, reject) => {
    let left = tries;
    const tick = () => {
      const req = http.get(`http://127.0.0.1:${port}/json/version`, res => {
        let body = '';
        res.on('data', d => {
          body += d;
        });
        res.on('end', () => resolve(body));
      });
      req.on('error', () => {
        left -= 1;
        if (left <= 0) reject(new Error(`CDP ${port} 未就绪`));
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

async function main() {
  const chrome = findChrome();
  if (!chrome) throw new Error('未找到 chrome.exe');

  const userData = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
  if (!fs.existsSync(userData)) throw new Error(`未找到 Chrome 用户目录: ${userData}`);

  console.log('启动日常 Chrome（远程调试）…');
  console.log('  exe:', chrome);
  console.log('  user-data-dir:', userData);
  console.log('  port:', PORT);

  const child = spawn(
    chrome,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userData}`,
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank'
    ],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    }
  );
  child.unref();

  const info = await waitCdp(PORT);
  console.log('✅ CDP 就绪');
  try {
    const json = JSON.parse(info);
    console.log('  Browser:', json.Browser || json.browser || '');
    console.log('  webSocketDebuggerUrl:', json.webSocketDebuggerUrl || '');
  } catch {
    console.log(info.slice(0, 200));
  }
  console.log(`\n下一步: node scripts/competitor-screenshots-stealth.js --all --cdp ${PORT}`);
}

main().catch(err => {
  console.error('❌', err.message);
  console.error('提示: 请确认已完全退出 Chrome（任务管理器无 chrome.exe），再重试。');
  process.exit(1);
});

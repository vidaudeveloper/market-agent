#!/usr/bin/env node
/**
 * 出海匠登录态检测（运行 pipeline / agent-ask 前调用）
 *
 * 用法:
 *   node scripts/chuhaijiang-auth-check.js           # 检查 storage/auth.json 是否含 auth_session
 *   node scripts/chuhaijiang-auth-check.js --probe   # 额外 headless 访问 workspace 验证
 *   node scripts/chuhaijiang-auth-check.js --json    # JSON 输出（MCP/脚本用）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORAGE = path.join(ROOT, 'auth', 'chuhaijiang-storage.json');
const AUTH_JSON = path.join(ROOT, 'auth.json');

function parseStorageSession(storagePath) {
  if (!fs.existsSync(storagePath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    const cookie = (data.cookies || []).find(c => c.name === 'auth_session');
    if (!cookie?.value) return null;
    const expired = cookie.expires && cookie.expires * 1000 < Date.now();
    return { value: cookie.value, expired, source: 'storage', path: storagePath };
  } catch {
    return null;
  }
}

function parseAuthJsonSession() {
  if (!fs.existsSync(AUTH_JSON)) return null;
  try {
    const auth = JSON.parse(fs.readFileSync(AUTH_JSON, 'utf-8'));
    const val = auth.cookies?.auth_session;
    if (!val || String(val).includes('从浏览器')) return null;
    return { value: val, expired: false, source: 'auth.json', path: AUTH_JSON };
  } catch {
    return null;
  }
}

function getLoginStatus() {
  const storage = parseStorageSession(STORAGE);
  const authJson = parseAuthJsonSession();

  let session = null;
  if (storage && !storage.expired) session = storage;
  else if (authJson) session = authJson;

  return {
    ok: !!session,
    session,
    storage_exists: fs.existsSync(STORAGE),
    has_auth_session: !!(storage?.value || authJson?.value),
    storage_expired: !!storage?.expired,
    recommended_action: session
      ? null
      : 'node scripts/chuhaijiang-fetch.js screenshot --login'
  };
}

async function probeWithPlaywright() {
  const { chromium } = require('playwright');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      storageState: fs.existsSync(STORAGE) ? STORAGE : undefined
    });
    const page = await context.newPage();
    await page.goto('https://www.chuhaijiang.com/app/workspace?country=US', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(2000);
    const probe = await page.evaluate(() => {
      const href = window.location.href;
      const loginInHeader = Array.from(document.querySelectorAll('button')).some(b => {
        const t = (b.textContent || '').trim();
        const rect = b.getBoundingClientRect();
        return t === '登录' && rect.top < 120 && rect.width > 0;
      });
      return {
        url: href,
        logged_in: href.includes('/app') && !href.includes('session_ended') && !loginInHeader
      };
    });
    return probe.logged_in;
  } finally {
    if (browser) await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const doProbe = args.includes('--probe');

  const status = getLoginStatus();
  let probeOk = null;

  if (doProbe && status.has_auth_session) {
    try {
      probeOk = await probeWithPlaywright();
      status.probe_ok = probeOk;
      status.ok = status.ok && probeOk;
    } catch (err) {
      status.probe_ok = false;
      status.probe_error = err.message;
    }
  }

  if (!status.ok && !status.recommended_action) {
    status.recommended_action = 'node scripts/chuhaijiang-fetch.js screenshot --login';
  }

  if (asJson) {
    console.log(JSON.stringify(status, null, 2));
  } else if (status.ok) {
    console.log(`✅ 出海匠登录态有效（${status.session.source}）${probeOk === true ? '，probe 通过' : ''}`);
  } else {
    console.log('❌ 出海匠未登录或 auth_session 已失效');
    if (status.storage_expired) console.log('   storage 中 auth_session 已过期');
    console.log(`   请执行: ${status.recommended_action}`);
    if (!asJson) console.log('   或 agent-ask 加 --headed --wait-login 在弹出窗口完成登录');
  }

  process.exit(status.ok ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { getLoginStatus, probeWithPlaywright, STORAGE };

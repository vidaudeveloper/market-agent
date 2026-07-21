#!/usr/bin/env node
/**
 * 竞品站截图（增强反检测）
 *
 * 用法:
 *   # 挂到已登录的日常 Chrome（推荐）
 *   node scripts/chrome-cdp-start.js          # 先启动调试端口
 *   node scripts/competitor-screenshots-stealth.js --all --cdp 9222
 *
 *   # 独立配置目录（会新开窗口）
 *   node scripts/competitor-screenshots-stealth.js --amazon --headed
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'output', 'assets', 'nike-competitors');
const PROFILE = path.join(ROOT, 'auth', 'browser-profile-screenshots');
const DATE = new Date().toISOString().slice(0, 10);

const AMAZON = [
  { id: 'amz-nike', name: 'Amazon Nike', url: 'https://www.amazon.com/s?k=Nike+sneakers&i=fashion-mens-shoes&language=en_US' },
  { id: 'amz-adidas', name: 'Amazon Adidas', url: 'https://www.amazon.com/s?k=Adidas+sneakers&i=fashion-mens-shoes&language=en_US' },
  { id: 'amz-new-balance', name: 'Amazon New Balance', url: 'https://www.amazon.com/s?k=New+Balance+sneakers&i=fashion-mens-shoes&language=en_US' },
  { id: 'amz-hoka', name: 'Amazon HOKA', url: 'https://www.amazon.com/s?k=HOKA+running+shoes&i=fashion-mens-shoes&language=en_US' },
  { id: 'amz-on', name: 'Amazon On', url: 'https://www.amazon.com/s?k=On+Cloud+shoes&i=fashion-mens-shoes&language=en_US' },
  { id: 'amz-puma', name: 'Amazon Puma', url: 'https://www.amazon.com/s?k=Puma+sneakers&i=fashion-mens-shoes&language=en_US' },
  { id: 'amz-asics', name: 'Amazon ASICS', url: 'https://www.amazon.com/s?k=ASICS+Gel+sneakers&i=fashion-mens-shoes&language=en_US' }
];

const OFFICIAL = [
  { id: 'adidas', name: 'Adidas', url: 'https://www.adidas.com/us/men-shoes' },
  { id: 'new-balance', name: 'New Balance', url: 'https://www.newbalance.com/men/shoes/' },
  { id: 'hoka', name: 'HOKA', url: 'https://www.hoka.com/en/us/mens-shoes/' },
  { id: 'asics', name: 'ASICS', url: 'https://www.asics.com/us/en-us/mens/shoes/c/as10000000/' },
  { id: 'puma', name: 'Puma', url: 'https://us.puma.com/us/en/men/shoes' },
  { id: 'nike', name: 'Nike', url: 'https://www.nike.com/w/new-mens-shoes-3n82yznik1zy7ok' },
  { id: 'on-running', name: 'On Running', url: 'https://www.on.com/en-us/shop/mens/shoes' }
];

function toRepoPosix(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

function parseArgs(argv) {
  const cdpIdx = argv.indexOf('--cdp');
  const profileIdx = argv.indexOf('--profile');
  return {
    amazon: argv.includes('--amazon') || argv.includes('--all'),
    official: argv.includes('--official') || argv.includes('--all'),
    headed: argv.includes('--headed'),
    cdpPort: cdpIdx >= 0 ? String(argv[cdpIdx + 1] || '9222') : null,
    profile: profileIdx >= 0 ? argv[profileIdx + 1] : null
  };
}

async function dismissOverlays(page) {
  const clicks = [
    '#sp-cc-accept',
    'input[data-action-type="DISMISS"]',
    '#onetrust-accept-btn-handler',
    'button:has-text("Accept All")',
    'button:has-text("Accept all")',
    'button:has-text("Accept Cookies")',
    'button:has-text("Allow All")',
    'button:has-text("Got it")',
    'button:has-text("OK")',
    'button:has-text("Go to Amazon.com")',
    'a:has-text("Go to Amazon.com")',
    'button:has-text("Stay on United States")',
    'button:has-text("Continue shopping")',
    '[data-action="a-popover-close"]'
  ];
  for (const sel of clicks) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 })) {
        await el.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(400);
      }
    } catch {
      // ignore
    }
  }
}

function looksBlocked(bodyText, status) {
  const t = (bodyText || '').slice(0, 1500);
  return (
    (status && status >= 400) ||
    /access denied|unable to give you access|temporarily restricted|something went wrong|robot check|enter the characters|not a robot|403|request blocked|verification required|slide right to secure|dogs of amazon/i.test(
      t
    )
  );
}

async function shot(context, target) {
  const page = await context.newPage();
  const file = path.join(OUT, `${target.id}-${DATE}.png`);
  const result = {
    id: target.id,
    name: target.name,
    url: target.url,
    path: null,
    ok: false,
    error: null
  };
  try {
    const resp = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2000 + Math.floor(Math.random() * 1500));
    await dismissOverlays(page);
    await page.waitForTimeout(1200);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(800);
    await dismissOverlays(page);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    const status = resp ? resp.status() : 0;
    const blocked = looksBlocked(bodyText, status);

    await page.screenshot({ path: file, fullPage: false });
    result.path = toRepoPosix(file);
    result.ok = !blocked;
    if (blocked) result.error = `blocked status=${status}`;
    console.log(result.ok ? '✅' : '⚠', target.name, result.error || '→', result.path);
  } catch (err) {
    result.error = err.message;
    console.warn('⚠', target.name, err.message);
    try {
      await page.screenshot({ path: file, fullPage: false });
      result.path = toRepoPosix(file);
    } catch {
      // ignore
    }
  } finally {
    await page.close().catch(() => {});
  }
  return result;
}

async function connectCdp(port) {
  const endpoint = `http://127.0.0.1:${port}`;
  let lastErr;
  for (let i = 0; i < 20; i += 1) {
    try {
      const browser = await chromium.connectOverCDP(endpoint);
      const context = browser.contexts()[0] || (await browser.newContext());
      console.log(`浏览器: 已挂接日常 Chrome (CDP ${endpoint})`);
      return { browser, context, mode: 'cdp' };
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`无法连接 CDP ${endpoint}: ${lastErr?.message || lastErr}`);
}

async function launchIsolated(headed, profileDir) {
  const userDataDir = profileDir
    ? (path.isAbsolute(profileDir) ? profileDir : path.join(ROOT, profileDir))
    : PROFILE;

  const launchOptions = {
    headless: !headed,
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  };

  let context;
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      ...launchOptions,
      channel: 'chrome'
    });
    console.log('浏览器: Chrome + 配置', toRepoPosix(userDataDir));
  } catch {
    context = await chromium.launchPersistentContext(userDataDir, launchOptions);
    console.log('浏览器: Chromium + 配置', toRepoPosix(userDataDir));
  }

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = window.chrome || { runtime: {} };
  });

  return { browser: null, context, mode: profileDir ? 'cloned-profile' : 'isolated' };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.amazon && !args.official) {
    console.log(
      '用法:\n  node scripts/competitor-screenshots-stealth.js --all --cdp 9222\n  node scripts/competitor-screenshots-stealth.js --amazon --headed'
    );
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const session = args.cdpPort
    ? await connectCdp(args.cdpPort)
    : await launchIsolated(args.headed, args.profile);

  if (!args.cdpPort && args.headed) {
    console.log('有界面模式：若需过验证码，请在窗口操作（等待 20 秒）…');
    await new Promise(r => setTimeout(r, 20000));
  }

  const results = [];
  try {
    const targets = [];
    if (args.amazon) targets.push(...AMAZON);
    if (args.official) targets.push(...OFFICIAL);
    for (const t of targets) {
      results.push(await shot(session.context, t));
      await new Promise(r => setTimeout(r, 1500 + Math.floor(Math.random() * 2000)));
    }
  } finally {
    if (session.mode === 'cdp') {
      // 只断开连接，不关用户的 Chrome
      await session.browser.close().catch(() => {});
      console.log('已断开 CDP（日常 Chrome 保持打开）');
    } else {
      await session.context.close().catch(() => {});
    }
  }

  const meta = path.join(ROOT, 'output', `nike-stealth-screenshots-${DATE}.json`);
  fs.writeFileSync(
    meta,
    JSON.stringify({ date: DATE, mode: session.mode, cdp: args.cdpPort, results }, null, 2)
  );
  console.log('\n清单:', toRepoPosix(meta));
  console.log('成功', results.filter(r => r.ok).length, '/', results.length);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

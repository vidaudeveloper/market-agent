#!/usr/bin/env node
/**
 * 对仍被拦的站点做第二轮：过 Adidas 简易验证、Amazon 先落地首页再建会话
 * 用法: node scripts/competitor-screenshots-retry2.js [--headed]
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'output', 'assets', 'nike-competitors');
const PROFILE = path.join(ROOT, 'auth', 'browser-profile-screenshots');
const DATE = new Date().toISOString().slice(0, 10);
const headed = process.argv.includes('--headed');

const TARGETS = [
  {
    id: 'adidas',
    name: 'Adidas',
    url: 'https://www.adidas.com/us/men-shoes',
    kind: 'adidas'
  },
  {
    id: 'new-balance',
    name: 'New Balance',
    url: 'https://www.newbalance.com/men/shoes/',
    kind: 'generic'
  },
  {
    id: 'hoka',
    name: 'HOKA',
    url: 'https://www.hoka.com/en/us/mens-shoes/',
    kind: 'generic'
  },
  {
    id: 'asics',
    name: 'ASICS',
    url: 'https://www.asics.com/us/en-us/mens/shoes/c/as10000000/',
    kind: 'generic'
  },
  {
    id: 'amz-nike',
    name: 'Amazon Nike',
    url: 'https://www.amazon.com/s?k=Nike+sneakers&i=fashion-mens-shoes',
    kind: 'amazon'
  },
  {
    id: 'amz-adidas',
    name: 'Amazon Adidas',
    url: 'https://www.amazon.com/s?k=Adidas+sneakers&i=fashion-mens-shoes',
    kind: 'amazon'
  },
  {
    id: 'amz-new-balance',
    name: 'Amazon New Balance',
    url: 'https://www.amazon.com/s?k=New+Balance+sneakers&i=fashion-mens-shoes',
    kind: 'amazon'
  },
  {
    id: 'amz-hoka',
    name: 'Amazon HOKA',
    url: 'https://www.amazon.com/s?k=HOKA+shoes&i=fashion-mens-shoes',
    kind: 'amazon'
  },
  {
    id: 'amz-on',
    name: 'Amazon On',
    url: 'https://www.amazon.com/s?k=On+Cloud+shoes&i=fashion-mens-shoes',
    kind: 'amazon'
  },
  {
    id: 'amz-puma',
    name: 'Amazon Puma',
    url: 'https://www.amazon.com/s?k=Puma+sneakers&i=fashion-mens-shoes',
    kind: 'amazon'
  },
  {
    id: 'amz-asics',
    name: 'Amazon ASICS',
    url: 'https://www.amazon.com/s?k=ASICS+Gel&i=fashion-mens-shoes',
    kind: 'amazon'
  }
];

function toRepoPosix(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

async function tryAdidasChallenge(page) {
  const input = page.locator('input[type="text"]').first();
  const btn = page.getByRole('button', { name: /I am not a Robot/i });
  if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
    if (await input.isVisible().catch(() => false)) {
      await input.fill('blue');
    }
    await btn.click();
    await page.waitForTimeout(4000);
    console.log('   → 已尝试 Adidas 人机验证');
  }
}

async function warmAmazon(page) {
  await page.goto('https://www.amazon.com/?language=en_US', {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });
  await page.waitForTimeout(2500);
  for (const sel of [
    '#sp-cc-accept',
    'input[data-action-type="DISMISS"]',
    'button:has-text("Go to Amazon.com")',
    'a:has-text("Go to Amazon.com")',
    'button:has-text("Continue shopping")'
  ]) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1000 })) await el.click({ timeout: 2000 });
    } catch {
      // ignore
    }
  }
  await page.waitForTimeout(1500);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE, {
      channel: 'chrome',
      headless: !headed,
      viewport: { width: 1440, height: 900 },
      locale: 'en-US',
      timezoneId: 'America/Los_Angeles',
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation']
    });
  } catch {
    context = await chromium.launchPersistentContext(PROFILE, {
      headless: !headed,
      viewport: { width: 1440, height: 900 },
      locale: 'en-US',
      args: ['--disable-blink-features=AutomationControlled'],
      ignoreDefaultArgs: ['--enable-automation']
    });
  }

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = window.chrome || { runtime: {} };
  });

  if (headed) {
    console.log('有界面模式：请在窗口完成 Amazon 登录 / 验证码（最多等 60 秒）…');
    const warm = await context.newPage();
    await warmAmazon(warm);
    await warm.waitForTimeout(60000);
    await warm.close();
  }

  const results = [];
  for (const t of TARGETS) {
    const page = await context.newPage();
    const file = path.join(OUT, `${t.id}-${DATE}.png`);
    const result = { id: t.id, name: t.name, url: t.url, path: null, ok: false, error: null };
    try {
      if (t.kind === 'amazon') await warmAmazon(page);
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(3000);
      if (t.kind === 'adidas') await tryAdidasChallenge(page);
      // 若仍有验证码且 headed，再等一会儿给人工
      if (headed) {
        const body = ((await page.locator('body').innerText().catch(() => '')) || '').slice(0, 500);
        if (/robot|captcha|something went wrong|unable to give you access|dogs of amazon/i.test(body)) {
          console.log(`   → ${t.name} 仍像验证页，等待 25 秒供人工处理…`);
          await page.waitForTimeout(25000);
        }
      }
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(800);
      const body = ((await page.locator('body').innerText().catch(() => '')) || '').slice(0, 800);
      const blocked = /unable to give you access|access denied|something went wrong|oops!|temporarily restricted|dogs of amazon|sorry/i.test(
        body
      );
      await page.screenshot({ path: file, fullPage: false });
      result.path = toRepoPosix(file);
      result.ok = !blocked;
      if (blocked) result.error = 'still_blocked';
      console.log(result.ok ? '✅' : '⚠', t.name, result.error || '→', result.path);
    } catch (e) {
      result.error = e.message;
      console.warn('⚠', t.name, e.message);
    } finally {
      await page.close().catch(() => {});
    }
    results.push(result);
  }

  await context.close();
  const meta = path.join(ROOT, 'output', `nike-retry2-screenshots-${DATE}.json`);
  fs.writeFileSync(meta, JSON.stringify({ date: DATE, results }, null, 2));
  console.log('\n清单:', toRepoPosix(meta));
  console.log('成功', results.filter(r => r.ok).length, '/', results.length);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

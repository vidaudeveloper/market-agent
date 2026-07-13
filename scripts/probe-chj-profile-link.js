#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const storage = path.join(__dirname, '..', 'auth', 'chuhaijiang-storage.json');
const handle = process.argv[2] || 'suguru_pup';
const country = process.argv[3] || 'TH';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctxOpts = { viewport: { width: 1400, height: 900 } };
  if (fs.existsSync(storage)) ctxOpts.storageState = storage;
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();

  await page.goto(`https://www.chuhaijiang.com/app/discover/tiktok/creators?country=${country}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });
  await page.waitForTimeout(2500);

  for (const sel of ['input[placeholder*="达人"]', 'input[placeholder*="搜索"]', 'input[type="search"]']) {
    const input = page.locator(sel).first();
    if (await input.count()) {
      await input.fill(handle);
      await input.press('Enter');
      await page.waitForTimeout(4000);
      break;
    }
  }

  const data = await page.evaluate(target => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    const row = rows.find(r => (r.innerText || '').includes(target)) || rows[0];
    if (!row) return { page: location.href, rows: rows.length };
    const links = Array.from(row.querySelectorAll('a[href]')).map(a => {
      const href = a.getAttribute('href') || '';
      return href.startsWith('http') ? href : `https://www.chuhaijiang.com${href}`;
    });
    return {
      page: location.href,
      rows: rows.length,
      text: row.innerText?.slice(0, 120),
      links
    };
  }, handle);

  // test MCP id URL
  const mcpId = '6834296583795409921';
  await page.goto(`https://www.chuhaijiang.com/app/discover/tiktok/creators/${mcpId}?country=${country}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(2000);
  const mcpUrlResult = page.url();

  console.log(JSON.stringify({ searchResult: data, mcpIdRedirect: mcpUrlResult }, null, 2));
  await browser.close();
})();

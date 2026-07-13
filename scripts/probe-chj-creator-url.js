#!/usr/bin/env node
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: path.join(__dirname, '..', 'auth', 'chuhaijiang-storage.json'),
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  for (const country of ['US', 'TH']) {
    const url = `https://www.chuhaijiang.com/app/discover/tiktok/creators?country=${country}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(3000);
    const data = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr')).slice(0, 2);
      return {
        pageUrl: location.href,
        rowCount: document.querySelectorAll('table tbody tr').length,
        rows: rows.map(row => {
          const img = row.querySelector('img');
          const links = Array.from(row.querySelectorAll('a[href]')).map(a => {
            const href = a.getAttribute('href') || '';
            return href.startsWith('http') ? href : `https://www.chuhaijiang.com${href}`;
          });
          return { img: img?.src?.slice(0, 120), links: links.slice(0, 4), text: row.innerText?.slice(0, 80) };
        })
      };
    });
    console.log(`\n=== ${country} ===`);
    console.log(JSON.stringify(data, null, 2));
  }

  await browser.close();
})();

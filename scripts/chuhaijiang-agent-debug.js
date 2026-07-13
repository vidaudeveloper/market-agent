#!/usr/bin/env node
/** Debug chuhaijiang chat DOM */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const STORAGE = path.join(__dirname, '..', 'auth', 'chuhaijiang-storage.json');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: STORAGE, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('https://www.chuhaijiang.com/app/chat?country=US', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  const info = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]')].map(el => ({
      tag: el.tagName,
      placeholder: el.getAttribute('placeholder'),
      className: el.className?.slice?.(0, 120),
      visible: !!(el.offsetParent)
    }));
    const buttons = [...document.querySelectorAll('button')].slice(0, 30).map(b => ({
      text: (b.innerText || '').trim().slice(0, 40),
      aria: b.getAttribute('aria-label'),
      className: b.className?.slice?.(0, 80)
    }));
    return { title: document.title, inputs, buttons, bodyLen: document.body.innerText.length };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();

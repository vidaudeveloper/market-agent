#!/usr/bin/env node
/**
 * 出海匠 (chuhaijiang.com) TikTok 电商数据抓取工具
 *
 * 用法:
 *   node scripts/chuhaijiang-fetch.js shop-ranking         # 店铺销量榜
 *   node scripts/chuhaijiang-fetch.js shop-ranking --top 10 # 前 10 名
 *   node scripts/chuhaijiang-fetch.js product-search "关键词" # 商品搜索
 *   node scripts/chuhaijiang-fetch.js product-detail <id>    # 商品详情(需付费)
 *
 * 认证: 需要 auth.json，参考 auth.example.json
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// 颜色输出
const c = { green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', reset: '\x1b[0m', bold: '\x1b[1m' };

function log(msg, color = '') { console.log(`${color}${msg}${c.reset}`); }

// --- 认证 ---
function loadAuth() {
  const authPath = path.join(__dirname, '..', 'auth.json');
  if (!fs.existsSync(authPath)) {
    log('\n⚠️  未找到 auth.json 文件', c.yellow);
    log('请按以下步骤获取认证信息:', c.yellow);
    log('  1. 在浏览器中登录 https://www.chuhaijiang.com');
    log('  2. F12 → Application → Cookies → chuhaijiang.com');
    log('  3. 找到 auth_session，双击 Value 复制');
    log('  4. F12 → Application → Local Storage → chuhaijiang.com');
    log('  5. 找到 _l_KPLiPs，复制 Value');
    log('  6. 将这些值填入 auth.json（参考 auth.example.json 模板）\n');
    process.exit(1);
  }
  const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
  if (auth.cookies?.auth_session === '从浏览器 Cookies 复制这个值（HttpOnly cookie，document.cookie 读不到）') {
    log('\n⚠️  auth.json 尚未填写真实认证信息', c.yellow);
    log('请编辑 auth.json 填入你的出海匠 cookie 和 localStorage 值\n', c.yellow);
    process.exit(1);
  }
  return auth;
}

async function injectAuth(page, auth) {
  // Set cookies
  if (auth.cookies) {
    const cookieList = Object.entries(auth.cookies).map(([name, value]) => ({
      name,
      value: String(value),
      domain: '.chuhaijiang.com',
      path: '/',
      httpOnly: name === 'auth_session',
      secure: true,
      sameSite: 'Lax'
    }));
    await page.context().addCookies(cookieList);
  }
  // Navigate first so localStorage domain is correct
  await page.goto('https://www.chuhaijiang.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Set localStorage
  if (auth.localStorage) {
    await page.evaluate((items) => {
      for (const [key, value] of Object.entries(items)) {
        localStorage.setItem(key, String(value));
      }
    }, auth.localStorage);
  }
}

function extractShopRows(pageContent) {
  // Extract shop ranking data from page text
  const lines = pageContent.split('\n').filter(l => l.trim());
  const shops = [];
  let currentShop = null;

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect rank numbers
    const rankMatch = trimmed.match(/^(\d{1,3})\s/);
    if (rankMatch && !trimmed.includes('排名') && !trimmed.includes('Rank')) {
      if (currentShop && currentShop.name) shops.push(currentShop);
      currentShop = { rank: parseInt(rankMatch[1]) };
      continue;
    }
    if (!currentShop) continue;
    // Detect shop name (usually after rank)
    if (!currentShop.name && rankMatch && trimmed.length < 100 && !trimmed.match(/^\d+$/)) {
      currentShop.name = trimmed.replace(/^\d+\s*/, '');
      continue;
    }
    // Detect numeric values
    const numMatch = trimmed.match(/([\d,.]+)\s*(万|亿)?/);
    if (numMatch && trimmed.length < 50) {
      if (!currentShop.dailySales) currentShop.dailySales = trimmed;
      else if (!currentShop.totalSales) currentShop.totalSales = trimmed;
      else if (!currentShop.dailyRevenue) currentShop.dailyRevenue = trimmed;
      else if (!currentShop.totalRevenue) currentShop.totalRevenue = trimmed;
    }
  }
  if (currentShop && currentShop.name) shops.push(currentShop);
  return shops;
}

// --- 店铺销量榜 ---
async function fetchShopRanking(topN = 3) {
  const auth = loadAuth();
  log('\n🔍 正在获取 TikTok 美区店铺销量排行...\n', c.cyan);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    await injectAuth(page, auth);
    await page.goto('https://www.chuhaijiang.com/app/discover/tiktok/shops/top-selling', {
      waitUntil: 'networkidle', timeout: 30000
    });
    await page.waitForTimeout(3000);

    // Check if still on login page
    if (page.url().includes('login')) {
      log('❌ 登录失败，auth_session 可能已过期', c.red);
      log('请重新获取 auth_session: F12 → Application → Cookies → auth_session', c.yellow);
      await browser.close();
      process.exit(1);
    }

    // Get table data via evaluation
    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const result = [];
      rows.forEach((row, i) => {
        if (i >= 20) return;
        const cells = row.querySelectorAll('td');
        if (cells.length < 6) return;
        result.push({
          rank: cells[0]?.innerText?.trim() || '',
          shop: cells[1]?.innerText?.trim()?.split('\n')[0] || '',
          company: cells[1]?.innerText?.trim()?.split('\n')[1] || '',
          category: cells[2]?.innerText?.trim() || '',
          rating: cells[3]?.innerText?.trim() || '',
          products: cells[4]?.innerText?.trim() || '',
          dailySales: cells[5]?.innerText?.trim() || '',
          totalSales: cells[6]?.innerText?.trim() || '',
          dailyRevenue: cells[7]?.innerText?.trim() || '',
          totalRevenue: cells[8]?.innerText?.trim() || ''
        });
      });
      return result;
    });

    if (data.length === 0) {
      // Try fallback: extract from page text
      const bodyText = await page.locator('body').innerText();
      const shops = extractShopRows(bodyText);
      if (shops.length === 0) {
        log('⚠️  未检测到表格数据，可能页面结构已变化', c.yellow);
        await page.screenshot({ path: path.join(__dirname, '..', 'output', 'chuhaijiang-debug.png'), fullPage: true });
        log('截图已保存至 output/chuhaijiang-debug.png，可发送给开发者调试', c.yellow);
      }
      displayShops(shops.slice(0, topN));
    } else {
      displayData(data.slice(0, topN));
    }

  } finally {
    await browser.close();
  }
}

function displayShops(shops) {
  log(`\n🏆 TikTok 美区店铺销量榜 TOP ${shops.length}\n`, c.bold + c.green);
  for (let i = 0; i < shops.length; i++) {
    const s = shops[i];
    const medal = ['🥇', '🥈', '🥉'][i] || `  ${i + 1}.`;
    log(`${medal} ${s.name || '未知店铺'}`, c.bold);
    if (s.dailySales) log(`   日销量: ${s.dailySales}`);
    if (s.totalSales) log(`   总销量: ${s.totalSales}`);
    if (s.dailyRevenue) log(`   日销售额: ${s.dailyRevenue}`);
    if (s.totalRevenue) log(`   总销售额: ${s.totalRevenue}`);
    console.log('');
  }
}

function displayData(data) {
  log(`\n🏆 TikTok 美区店铺销量榜 TOP ${data.length}\n`, c.bold + c.green);
  for (let i = 0; i < data.length; i++) {
    const s = data[i];
    const medal = ['🥇', '🥈', '🥉'][i] || `  ${i + 1}.`;
    log(`${medal} ${s.shop || '未知店铺'}`, c.bold);
    if (s.company) log(`   公司: ${s.company}`);
    if (s.category) log(`   类目: ${s.category}`);
    if (s.rating) log(`   评分: ${s.rating}`);
    if (s.products) log(`   在售商品: ${s.products}`);
    if (s.dailySales) log(`   日销量: ${s.dailySales}`);
    if (s.totalSales) log(`   总销量: ${s.totalSales}`);
    if (s.dailyRevenue) log(`   日销售额: ${s.dailyRevenue}`);
    if (s.totalRevenue) log(`   总销售额: ${s.totalRevenue}`);
    console.log('');
  }
}

// --- 商品搜索 ---
async function fetchProductSearch(keyword) {
  const auth = loadAuth();
  log(`\n🔍 正在搜索出海匠商品: "${keyword}"...\n`, c.cyan);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    await injectAuth(page, auth);
    await page.goto('https://www.chuhaijiang.com/app/discover/tiktok/products?country=US', {
      waitUntil: 'networkidle', timeout: 30000
    });
    await page.waitForTimeout(2000);

    if (page.url().includes('login')) {
      log('❌ 登录失败，auth_session 可能已过期', c.red);
      await browser.close();
      process.exit(1);
    }

    // Fill search
    const searchInput = page.locator('input[placeholder="输入商品、店铺或企业名称搜索"]');
    await searchInput.click();
    await searchInput.fill(keyword);
    await searchInput.press('Enter');
    await page.waitForTimeout(3000);

    // Get results
    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const result = [];
      rows.forEach((row, i) => {
        if (i >= 10) return;
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        const link = row.querySelector('a');
        result.push({
          product: cells[0]?.innerText?.trim() || '',
          shop: cells[1]?.innerText?.trim() || '',
          sales7d: cells[2]?.innerText?.trim() || '',
          totalSales: cells[3]?.innerText?.trim() || '',
          revenue7d: cells[4]?.innerText?.trim() || '',
          totalRevenue: cells[5]?.innerText?.trim() || '',
          creators: cells[6]?.innerText?.trim() || '',
          url: link?.href || ''
        });
      });
      return result;
    });

    if (data.length === 0) {
      log('⚠️  未找到匹配的商品', c.yellow);
    } else {
      log(`📦 找到 ${data.length} 个商品:\n`, c.green);
      data.forEach((item, i) => {
        log(`${i + 1}. ${item.product.substring(0, 60)}`, c.bold);
        if (item.shop) log(`   店铺: ${item.shop}`);
        if (item.sales7d) log(`   近7天销量: ${item.sales7d}`);
        if (item.totalSales) log(`   总销量: ${item.totalSales}`);
        if (item.revenue7d) log(`   近7天销售额: ${item.revenue7d}`);
        if (item.totalRevenue) log(`   总销售额: ${item.totalRevenue}`);
        console.log('');
      });
    }

  } finally {
    await browser.close();
  }
}

// --- 主入口 ---
const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  log('用法:', c.bold);
  log('  node scripts/chuhaijiang-fetch.js shop-ranking           店铺销量榜');
  log('  node scripts/chuhaijiang-fetch.js shop-ranking --top 5   店铺销量榜 TOP 5');
  log('  node scripts/chuhaijiang-fetch.js product-search "搜索词"  商品搜索');
  process.exit(0);
}

(async () => {
  switch (command) {
    case 'shop-ranking': {
      const topIdx = args.indexOf('--top');
      const topN = topIdx >= 0 ? parseInt(args[topIdx + 1]) || 3 : 3;
      await fetchShopRanking(topN);
      break;
    }
    case 'product-search': {
      const keyword = args[1];
      if (!keyword) { log('请提供搜索关键词', c.red); process.exit(1); }
      await fetchProductSearch(keyword);
      break;
    }
    default:
      log(`未知命令: ${command}`, c.red);
      log('支持: shop-ranking, product-search', c.yellow);
      process.exit(1);
  }
})();

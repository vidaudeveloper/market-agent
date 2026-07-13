#!/usr/bin/env node
/**
 * 下载出海匠 CDN 图片到本地，供飞书上传使用（外链在飞书 Markdown 中会显示上传失败）
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function fetchBuffer(url, redirect = 0) {
  return new Promise((resolve, reject) => {
    if (!url || redirect > 5) return reject(new Error('图片 URL 无效或重定向过多'));
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.chuhaijiang.com/' } }, res => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          res.resume();
          return resolve(fetchBuffer(next, redirect + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function isValidImageBuffer(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const head = buffer.slice(0, 12);
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return true;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return true;
  if (head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP') return true;
  const text = head.toString('utf8', 0, Math.min(20, buffer.length)).trim();
  if (text.startsWith('<svg') || text.startsWith('<?xml')) return false;
  return false;
}

function extFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) return '.jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return '.png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return '.jpg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF') return '.webp';
  return '.jpg';
}

function isValidAvatarUrl(url) {
  const u = String(url || '');
  if (!u || /logo|chj-logo|\.svg/i.test(u)) return false;
  return /ttm_user|tiktokx-cropcenter|tiktokcdn|tiktokv/i.test(u);
}

function writeImageBuffer(buffer, destPath) {
  if (!isValidImageBuffer(buffer)) return null;
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ext = extFromBuffer(buffer);
  const finalPath = destPath.replace(/\.[^.]+$/, '') + ext;
  fs.writeFileSync(finalPath, buffer);
  return finalPath;
}

async function downloadRemoteImage(url, destPath) {
  if (!url || !isValidAvatarUrl(url)) return null;
  try {
    const buffer = await fetchBuffer(url);
    return writeImageBuffer(buffer, destPath);
  } catch (err) {
    console.warn(`   ⚠ 头像下载失败: ${String(url).slice(0, 60)}… (${err.message})`);
    return null;
  }
}

async function downloadEntityImages(items, options = {}) {
  const { prefix = 'img', urlKey = 'avatar', destKey = 'avatarLocal', dir } = options;
  const outDir = dir || path.join(__dirname, '..', 'output', 'chuhaijiang-assets', 'avatars');
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };
    const url = item[urlKey];
    if (!url) {
      item[destKey] = null;
      results.push(item);
      continue;
    }
    const file = path.join(outDir, `${prefix}-${item.rank || i + 1}`);
    item[destKey] = await downloadRemoteImage(url, file + '.jpg');
    results.push(item);
  }
  return results;
}

async function fetchTiktokAvatarPlaywright(page, handle) {
  const h = String(handle || '').replace(/^@/, '').trim();
  if (!h) return null;
  try {
    await page.goto(`https://www.tiktok.com/@${h}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await page.waitForTimeout(2500);
    const src = await page.evaluate(() => {
      const selectors = [
        'img[data-e2e="user-avatar"]',
        'img[class*="ImgAvatar"]',
        'header img',
        'img'
      ];
      for (const sel of selectors) {
        const img = document.querySelector(sel);
        if (img?.src && /tiktok|byteimg|muscdn/i.test(img.src) && img.width >= 40) {
          return img.src;
        }
      }
      return '';
    });
    if (!src) return null;
    const resp = await page.request.get(src);
    if (!resp.ok()) return null;
    const buffer = await resp.body();
    return isValidImageBuffer(buffer) ? buffer : null;
  } catch {
    return null;
  }
}

async function fetchChjListRowPlaywright(page, handle, country = 'TH') {
  const h = String(handle || '').replace(/^@/, '').trim();
  if (!h) return null;

  const listUrl = `https://www.chuhaijiang.com/app/discover/tiktok/creators?country=${country}`;
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 90000 });
  if (!page.url().includes('chuhaijiang.com/app')) return null;

  for (const sel of ['input[placeholder*="达人"]', 'input[placeholder*="创作者"]', 'input[placeholder*="搜索"]', 'input[type="search"]']) {
    const input = page.locator(sel).first();
    if (await input.count()) {
      await input.fill(h);
      await input.press('Enter');
      await page.waitForTimeout(3500);
      break;
    }
  }

  return page.evaluate(targetHandle => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    const row = rows.find(r => (r.innerText || '').includes(targetHandle));
    if (!row) return null;
    const img = row.querySelector('img');
    const links = Array.from(row.querySelectorAll('a[href]')).map(a => {
      const href = a.getAttribute('href') || '';
      return href.startsWith('http') ? href : `https://www.chuhaijiang.com${href}`;
    });
    const avatar = img?.src || '';
    const profileUrl = links.find(u => /\/creators\/\d+/i.test(u)) || links.find(u => /creator/i.test(u)) || '';
    return { avatar, profileUrl };
  }, h);
}

/**
 * Playwright：优先出海匠列表行头像，失败则 TikTok 主页头像
 */
async function downloadEntityImagesPlaywright(items, options = {}) {
  const { prefix = 'img', destKey = 'avatarLocal', dir, country = 'TH' } = options;
  const outDir = dir || path.join(__dirname, '..', 'output', 'chuhaijiang-assets', 'avatars');
  const storagePath = path.join(__dirname, '..', 'auth', 'chuhaijiang-storage.json');

  const { chromium } = require('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const contextOpts = {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1400, height: 900 }
  };
  if (fs.existsSync(storagePath)) {
    contextOpts.storageState = storagePath;
  }
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  const results = [];

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < items.length; i++) {
    const item = { ...items[i] };
    if (item[destKey] && fs.existsSync(item[destKey])) {
      results.push(item);
      continue;
    }

    let buffer = null;
    let profileUrl = item.profileUrl || '';

    try {
      const listRow = await fetchChjListRowPlaywright(page, item.handle, country);
      if (listRow?.profileUrl) profileUrl = listRow.profileUrl;
      if (listRow?.avatar && isValidAvatarUrl(listRow.avatar)) {
        const resp = await page.request.get(listRow.avatar);
        if (resp.ok()) {
          const b = await resp.body();
          if (isValidImageBuffer(b)) buffer = b;
        }
      }
    } catch (err) {
      console.warn(`   ⚠ 出海匠列表抓取失败 ${item.handle}: ${err.message}`);
    }

    if (!buffer) {
      buffer = await fetchTiktokAvatarPlaywright(page, item.handle);
    }

    if (buffer) {
      const file = path.join(outDir, `${prefix}-${item.rank || i + 1}`);
      item[destKey] = writeImageBuffer(buffer, file + '.jpg');
      item.profileUrl = profileUrl || item.profileUrl;
      console.log(`   ✓ 头像 ${item.handle}${profileUrl ? ' (含出海匠页链)' : ' (TikTok)'}`);
    } else {
      item[destKey] = null;
      console.warn(`   ⚠ 头像未获取 ${item.handle}`);
    }

    results.push(item);
  }

  await browser.close();
  return results;
}

async function fetchUnavatarTiktok(handle) {
  const h = String(handle || '').replace(/^@/, '').trim();
  if (!h) return null;
  try {
    const buffer = await fetchBuffer(`https://unavatar.io/tiktok/${encodeURIComponent(h)}`);
    return isValidImageBuffer(buffer) ? buffer : null;
  } catch {
    return null;
  }
}

async function downloadEntityImagesWithFallback(items, options = {}) {
  const destKey = options.destKey || 'avatarLocal';
  const outDir = options.dir || path.join(__dirname, '..', 'output', 'chuhaijiang-assets', 'avatars');
  const prefix = options.prefix || 'img';
  let results = await downloadEntityImages(items, options);

  const missing = results.filter(r => !r[destKey]);
  if (!missing.length) return results;

  console.log('   改用 unavatar.io 抓取 TikTok 头像…');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const item of results) {
    if (item[destKey]) continue;
    const buffer = await fetchUnavatarTiktok(item.handle);
    if (buffer) {
      const file = path.join(outDir, `${prefix}-${item.rank || 0}`);
      item[destKey] = writeImageBuffer(buffer, file + '.jpg');
      console.log(`   ✓ 头像 ${item.handle} (unavatar)`);
    }
  }

  if (!results.some(r => !r[destKey])) return results;

  console.log('   仍有缺失，改用 Playwright 抓取（出海匠列表 / TikTok 主页）…');
  return downloadEntityImagesPlaywright(results, options);
}

function buildTiktokCreatorUrl(handle) {
  const h = String(handle || '').replace(/^@/, '').trim();
  return h ? `https://www.tiktok.com/@${h}` : '';
}

function normalizeChjCountry(country = 'TH') {
  const c = String(country || 'TH').trim().toUpperCase();
  return c || 'TH';
}

function buildChuhaijiangCreatorProfileUrl(id, country = 'TH') {
  const webId = String(id || '').trim();
  if (!webId) return '';
  const cc = normalizeChjCountry(country);
  return `https://www.chuhaijiang.com/app/discover/tiktok/creators/${webId}?country=${cc}`;
}

function buildChuhaijiangCreatorSearchUrl(handle, country = 'TH') {
  const h = String(handle || '').replace(/^@/, '').trim();
  if (!h) return '';
  const cc = normalizeChjCountry(country);
  return `https://www.chuhaijiang.com/app/discover/tiktok/creators?country=${cc}&keyword=${encodeURIComponent(h)}`;
}

function extractCreatorIdFromItem(item) {
  const direct = String(item.creatorId || item.chjWebId || item.tiktokUid || '').trim();
  if (direct) return direct;
  const fromProfile = extractIdFromChjUrl(item.profileUrl, 'creators');
  if (fromProfile) return fromProfile;
  const m = String(item.avatar || '').match(/ttm_user\/u-(\d+)/);
  return m ? m[1] : '';
}

/**
 * 解析达人出海匠详情直链。
 * 泰国等市场：MCP search/get_detail 返回的 id 可直接用于 /creators/{id}?country=TH。
 * 优先列表行抓取的 profileUrl，否则用 creatorId / 头像路径中的 UID。
 */
function resolveChuhaijiangCreatorLink(item, country = 'TH') {
  const cc = normalizeChjCountry(country);
  const profile = String(item.profileUrl || '').trim();
  if (profile && /\/creators\/\d+/i.test(profile)) {
    const webId = extractIdFromChjUrl(profile, 'creators');
    if (webId) return buildChuhaijiangCreatorProfileUrl(webId, cc);
    return profile.split('?')[0] + `?country=${cc}`;
  }
  const id = extractCreatorIdFromItem(item);
  if (id) return buildChuhaijiangCreatorProfileUrl(id, cc);
  return buildChuhaijiangCreatorSearchUrl(item.handle, cc);
}

async function resolveChuhaijiangProfileUrls(items, options = {}) {
  const country = normalizeChjCountry(options.country || 'TH');
  const results = items.map(item => {
    const out = { ...item };
    out.chjUrl = resolveChuhaijiangCreatorLink(out, country);
    out.chjLinkLabel = '出海匠';
    return out;
  });

  const storagePath = path.join(__dirname, '..', 'auth', 'chuhaijiang-storage.json');
  if (!fs.existsSync(storagePath)) {
    console.log(`   使用 MCP/头像 UID 生成详情直链（${results.filter(r => r.chjUrl.includes('/creators/')).length}/${results.length}）`);
    return results;
  }

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: storagePath,
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    try {
      const listRow = await fetchChjListRowPlaywright(page, item.handle, country);
      if (listRow?.profileUrl) {
        item.profileUrl = listRow.profileUrl;
        item.chjUrl = resolveChuhaijiangCreatorLink(item, country);
        console.log(`   ✓ 出海匠链接 ${item.handle}（列表页校验）`);
      }
    } catch (err) {
      console.warn(`   ⚠ 出海匠链接校验失败 ${item.handle}: ${err.message}`);
    }
  }

  await browser.close();
  return results;
}

function buildTiktokShopUrl(shopId) {
  const id = String(shopId || '').trim();
  return id ? `https://www.tiktok.com/shop/store/${id}` : '';
}

function extractIdFromChjUrl(url, segment) {
  const m = String(url || '').match(new RegExp(`/${segment}/([^/?]+)`));
  return m ? m[1] : '';
}

module.exports = {
  downloadRemoteImage,
  downloadEntityImages,
  downloadEntityImagesPlaywright,
  downloadEntityImagesWithFallback,
  buildTiktokCreatorUrl,
  buildChuhaijiangCreatorProfileUrl,
  buildChuhaijiangCreatorSearchUrl,
  resolveChuhaijiangCreatorLink,
  resolveChuhaijiangProfileUrls,
  extractCreatorIdFromItem,
  buildTiktokShopUrl,
  extractIdFromChjUrl,
  isValidImageBuffer,
  isValidAvatarUrl
};

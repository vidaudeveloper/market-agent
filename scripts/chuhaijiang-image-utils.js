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

function extFromUrl(url) {
  const m = String(url).match(/\.(webp|jpe?g|png|gif)(\?|$)/i);
  return m ? `.${m[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

async function downloadRemoteImage(url, destPath) {
  if (!url) return null;
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    const buffer = await fetchBuffer(url);
    if (!buffer.length) throw new Error('空文件');
    fs.writeFileSync(destPath, buffer);
    return destPath;
  } catch (err) {
    console.warn(`   ⚠ 头像下载失败: ${url.slice(0, 60)}… (${err.message})`);
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
    const ext = extFromUrl(url);
    const file = path.join(outDir, `${prefix}-${i + 1}-${Date.now()}${ext}`);
    item[destKey] = await downloadRemoteImage(url, file);
    results.push(item);
  }
  return results;
}

function buildTiktokCreatorUrl(handle) {
  const h = String(handle || '').replace(/^@/, '').trim();
  return h ? `https://www.tiktok.com/@${h}` : '';
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
  buildTiktokCreatorUrl,
  buildTiktokShopUrl,
  extractIdFromChjUrl
};

#!/usr/bin/env node
/**
 * 把出海匠 pipeline / agent-ask 的运行元数据转换为 Project Facts 补丁。
 *
 * 设计原则：
 * - 只登记「可追溯」的实体、证据和截图，不臆造数值 fact（数值由 Agent 结合原始数据判断后再写）。
 * - 所有路径转为仓库相对 POSIX 路径，便于团队分发与跨平台。
 *
 * 用法:
 *   node scripts/chuhaijiang-facts-mapper.js \
 *     --meta output/出海匠链路测试-2026-07-17.json \
 *     --facts output/{project}-project-facts.json
 *
 *   仅生成补丁（不合并）:
 *   node scripts/chuhaijiang-facts-mapper.js --meta <meta.json> --out output/facts-patch.json
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function toRepoPosix(filePath) {
  if (!filePath) return '';
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  return path.relative(ROOT, absolute).replace(/\\/g, '/');
}

function nowIso() {
  return new Date().toISOString();
}

function safeText(value) {
  return String(value == null ? '' : value)
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function idFromUrl(url, fallback) {
  const m = String(url || '').match(/\/(shops|creators|products)\/(\d+)/);
  if (m) return `chj-${m[1]}-${m[2]}`;
  return fallback;
}

function buildPatch(meta) {
  const retrievedAt = meta.date ? `${meta.date}T00:00:00.000Z` : nowIso();
  const keyword = meta.keyword || '';
  const patch = {
    entities: { competitors: [], sellers: [], products: [], creators: [] },
    evidence: [],
    screenshots: [],
    gaps: []
  };

  const evidenceId = `ev-chj-pipeline-${meta.date || 'run'}`;
  patch.evidence.push({
    id: evidenceId,
    type: 'pipeline',
    source_name: `出海匠 pipeline（关键词 ${keyword || 'N/A'}）`,
    source_url: 'https://www.chuhaijiang.com/',
    retrieved_at: retrievedAt,
    status: 'verified',
    entity_refs: [],
    fields: ['shops', 'creators', 'products'],
    note: `chuhaijiang-pipeline-test.js 输出 ${toRepoPosix(meta.reportPath)}`
  });

  const entityRefs = new Set();

  for (const shop of meta.shops || []) {
    const id = idFromUrl(shop.shopUrl, `chj-shop-${safeText(shop.rank) || patch.entities.sellers.length + 1}`);
    entityRefs.add(id);
    const name = safeText(shop.dailySales).split(' ')[0] || safeText(shop.shop) || id;
    const record = {
      id,
      name,
      raw_label: safeText(shop.dailySales),
      category: safeText(shop.category),
      chuhaijiang_url: safeText(shop.shopUrl),
      tiktok_url: safeText(shop.tiktokUrl),
      source: 'chuhaijiang-pipeline'
    };
    patch.entities.sellers.push(record);
    patch.entities.competitors.push({
      id: `competitor-${id}`,
      name,
      seller_ref: id,
      keyword,
      source: 'chuhaijiang-pipeline'
    });
    if (shop.avatarLocal) {
      patch.screenshots.push({
        id: `shot-${id}-avatar`,
        path: toRepoPosix(shop.avatarLocal),
        page_url: safeText(shop.shopUrl),
        captured_at: retrievedAt,
        entity_ref: id,
        evidence_id: evidenceId,
        caption: `${name} 店铺头像`
      });
    }
  }

  for (const creator of meta.creators || []) {
    const id = idFromUrl(creator.chjUrl || creator.chjProfile, `chj-creator-${safeText(creator.rank) || patch.entities.creators.length + 1}`);
    entityRefs.add(id);
    patch.entities.creators.push({
      id,
      name: safeText(creator.name) || id,
      handle: safeText(creator.handle),
      tags: safeText(creator.tags),
      chuhaijiang_url: safeText(creator.chjUrl),
      tiktok_url: safeText(creator.tiktokUrl),
      source: 'chuhaijiang-pipeline'
    });
  }

  for (const product of meta.products || []) {
    const id = idFromUrl(product.productUrl, `chj-product-${patch.entities.products.length + 1}`);
    entityRefs.add(id);
    patch.entities.products.push({
      id,
      name: safeText(product.name) || id,
      chuhaijiang_url: safeText(product.productUrl),
      source: 'chuhaijiang-pipeline'
    });
  }

  patch.evidence[0].entity_refs = [...entityRefs];

  const shotLabels = {
    creators: '达人智能筛选页',
    shops: '竞品店铺销量榜',
    products: '爆款商品搜索页'
  };
  for (const [key, imgPath] of Object.entries(meta.screenshots || {})) {
    if (!imgPath) continue;
    patch.screenshots.push({
      id: `shot-page-${key}-${meta.date || 'run'}`,
      path: toRepoPosix(imgPath),
      page_url: 'https://www.chuhaijiang.com/',
      captured_at: retrievedAt,
      entity_ref: '',
      evidence_id: evidenceId,
      caption: shotLabels[key] || key
    });
  }

  patch.gaps.push({
    id: `gap-numeric-facts-${meta.date || 'run'}`,
    field: 'facts',
    reason: '销量/GMV/渠道等数值需 Agent 核对原始抓取后写入 facts（pipeline 表格列可能错位）',
    blocking_skills: []
  });

  return patch;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function mapMetaToPatch(meta) {
  return buildPatch(meta);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.meta) throw new Error('缺少 --meta <pipeline 元数据 JSON>');
  const metaPath = path.isAbsolute(args.meta) ? args.meta : path.join(ROOT, args.meta);
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const patch = buildPatch(meta);

  const outPath = args.out
    ? (path.isAbsolute(args.out) ? args.out : path.join(ROOT, args.out))
    : path.join(ROOT, 'output', `facts-patch-chj-${meta.date || 'run'}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(patch, null, 2)}\n`, 'utf8');
  console.log('✅ 已生成 Project Facts 补丁:', path.relative(ROOT, outPath).replace(/\\/g, '/'));

  if (args.facts) {
    const factsPath = path.isAbsolute(args.facts) ? args.facts : path.join(ROOT, args.facts);
    execFileSync(
      process.execPath,
      [path.join(ROOT, 'scripts', 'project-facts.js'), 'merge', '--file', factsPath, '--patch', outPath],
      { stdio: 'inherit' }
    );
  } else {
    console.log('   合并到事实包: node scripts/project-facts.js merge --file <facts> --patch', path.relative(ROOT, outPath).replace(/\\/g, '/'));
  }
}

module.exports = { mapMetaToPatch, toRepoPosix };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
}

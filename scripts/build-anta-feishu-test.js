#!/usr/bin/env node
/**
 * 构建 ANTA 达人表飞书导出测试文档（不调用 MCP）
 * - 表格格式对齐 chuhaijiang-pipeline-test.js（· 占位 + 裸 URL 双链接列）
 * - 下载头像到本地供 embedImagesInTableColumn 上传
 *
 * 用法:
 *   node scripts/build-anta-feishu-test.js
 *   node scripts/build-anta-feishu-test.js --export-feishu
 */

const fs = require('fs');
const path = require('path');
const { downloadEntityImagesWithFallback, buildTiktokCreatorUrl, resolveChuhaijiangProfileUrls } = require('./chuhaijiang-image-utils');
const { sanitizeTableCell } = require('./feishu-chunk-utils');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'output');
const DATE = new Date().toISOString().slice(0, 10);

/** 静态达人数据（来自上轮 MCP 查询结果，本次不重新拉取） */
const CREATORS = [
  { rank: 1, name: 'ปั๊บปรับท่าวิ่ง', handle: 'suguru_pup', fans: '4.6万', gmv: '141.5万 TH', engagement: '1.9%', category: '跑步', note: 'P0 复投', creatorId: '6834296583795409921', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-6834296583795409921%2F3134ef2420ce9a834eafb462a052988a~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 2, name: 'ฟิตกับแพม', handle: 'pamelafitnessqueen', fans: '31.1万', gmv: '110.7万 TH', engagement: '4.6%', category: '健身', note: 'P0 跑步+服饰', creatorId: '7062909373031056410', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-7062909373031056410%2Fbfba52a8f98f2bc04235e6a0688afff0~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 3, name: 'Sports Shoes No.1', handle: 'petch_aphiwat', fans: '3.6万', gmv: '168.6万 TH', engagement: '1.3%', category: '鞋类竞品', note: '对标直播', creatorId: '6925311088414409729', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-6925311088414409729%2F44305a8ee93e045bad929348ef134579~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 4, name: 'Skechers Sports TH', handle: 'skecherssportsth', fans: '5.4万', gmv: '78.7万 TH', engagement: '0.5%', category: '运动竞品', note: '对标自播', creatorId: '7245187294940120069', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-7245187294940120069%2F5a56f187cfa78dcb3723819c83559be0~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 5, name: 'SOLID Sports', handle: 'solid_sports_', fans: '6.0万', gmv: '68.5万 TH', engagement: '0.9%', category: '运动装备', note: 'P1 服饰', creatorId: '7092819378051908609', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-7092819378051908609%2F627c783ac80a170f55150cf2e818cc4b~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 6, name: 'Posports', handle: 'posportsth', fans: '6.6万', gmv: '50.6万 TH', engagement: '1.6%', category: '足球鞋', note: 'P1', creatorId: '6923419444648035329', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-6923419444648035329%2Fb9248407dea6bac3d44bc73f756c90fc~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 7, name: 'ตูนตูน ฟิตเนส', handle: 'toontoonfitness', fans: '3.3万', gmv: '76.4万 TH', engagement: '2.4%', category: '健身', note: 'P0', creatorId: '6535243582852186114', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-6535243582852186114%2F817ec68974d9c93cb3b15221882e697e~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 8, name: 'justwannahoops', handle: 'justwannahoops', fans: '7.5万', gmv: '54.9万 TH', engagement: '4.0%', category: '篮球', note: 'P0 KAI', creatorId: '7012203862710993947', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-7012203862710993947%2F75720843d2fb1bc15b3e143d2050072b~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 9, name: 'ซ้อมบาสกับแบมบู', handle: 'janedesk', fans: '1,666', gmv: '35.1万 TH', engagement: '2.9%', category: '篮球', note: 'P0 高GPM', creatorId: '6836678014320837634', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-6836678014320837634%2F9bea995daa77c1bb1c7f466142fc1b85~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 10, name: 'AprilKicks', handle: 'aprilkicks', fans: '1.9万', gmv: '108.3万 TH', engagement: '2.9%', category: '球鞋测评', note: 'P1', creatorId: '7041569630221730817', avatar: 'https://oss-th.chuhaijiang.com/v1%2Fos%2Fttm_user%2Fu-7041569630221730817%2F0e6be033d617c28f09dffb185413ca81~tplv-tiktokx-cropcenter:168:168.webp' },
  { rank: 11, name: 'A TEH LOVE', handle: 'ateh..love', fans: '2,075', gmv: '37.9万 TH', engagement: '3.0%', category: '生活方式', note: 'P1 已带货ANTA', creatorId: '7445379942937216007', avatar: '' },
  { rank: 12, name: 'BESTKETGYM', handle: 'the_alphabest_', fans: '2,396', gmv: '31.1万 TH', engagement: '1.8%', category: '篮球/健身', note: 'P1', creatorId: '6874406989809271809', avatar: '' },
  { rank: 13, name: 'แชมป์ 4 ทุ่มนอน', handle: 'championmonoli', fans: '1.4万', gmv: '25.5万 TH', engagement: '2.7%', category: '运动', note: 'P2', creatorId: '7080193894500221953', avatar: '' },
  { rank: 14, name: 'NH.NightHoop', handle: 'night.hoop', fans: '1,429', gmv: '11.6万 TH', engagement: '1.9%', category: '篮球', note: 'P2', creatorId: '6936816942461666306', avatar: '' },
  { rank: 15, name: 'Sole Soul Run', handle: 'jgot2', fans: '4,000', gmv: '10.8万 TH', engagement: '1.8%', category: '跑步', note: 'P2', creatorId: '6823880339124356101', avatar: '' }
];

const BD_CREATORS = [
  { rank: 1, name: 'justwannahoops', handle: 'justwannahoops', fans: '7.5万', category: '篮球生活方式', quote: '300-600', sku: 'KAI 全系列', note: '已有带货记录', creatorId: '7012203862710993947' },
  { rank: 2, name: 'ซ้อมบาสกับแบมบู', handle: 'janedesk', fans: '1,666', category: '篮球粉丝', quote: '80-150', sku: 'KAI2/SWAGGER', note: '高 GPM', creatorId: '6836678014320837634' },
  { rank: 3, name: 'ฟิตกับแพม', handle: 'pamelafitnessqueen', fans: '31.1万', category: '健身女王', quote: '800-1500', sku: '跑步+服饰', note: 'Miss Grand 2017', creatorId: '7062909373031056410' },
  { rank: 4, name: 'ตูนตูน ฟิตเนส', handle: 'toontoonfitness', fans: '3.3万', category: '健身', quote: '200-400', sku: '跑步+器材', note: '男性粉 82%', creatorId: '6535243582852186114' },
  { rank: 5, name: 'AprilKicks', handle: 'aprilkicks', fans: '1.9万', category: '球鞋测评', quote: '150-300', sku: '全鞋款测评', note: '直评风格', creatorId: '7041569630221730817' }
];

function enrichCreators(list) {
  return list.map(c => ({
    ...c,
    tiktokUrl: buildTiktokCreatorUrl(c.handle),
    chjLinkLabel: '出海匠'
  }));
}

function buildTtsTableRows(creators) {
  return creators
    .map(c =>
      [
        sanitizeTableCell(c.rank),
        '·',
        sanitizeTableCell(c.name),
        sanitizeTableCell(`@${c.handle}`),
        sanitizeTableCell(c.fans),
        sanitizeTableCell(c.gmv),
        sanitizeTableCell(c.engagement),
        sanitizeTableCell(c.category),
        sanitizeTableCell(c.note),
        '链接',
        sanitizeTableCell(`@${c.handle}`)
      ].join(' | ')
    )
    .map(row => `| ${row} |`)
    .join('\n');
}

function buildBdTableRows(creators) {
  return creators
    .map(c =>
      [
        sanitizeTableCell(c.rank),
        sanitizeTableCell(c.name),
        sanitizeTableCell(`@${c.handle}`),
        sanitizeTableCell(c.fans),
        sanitizeTableCell(c.category),
        sanitizeTableCell(c.quote),
        sanitizeTableCell(c.sku),
        sanitizeTableCell(c.note),
        sanitizeTableCell(`@${c.handle}`)
      ].join(' | ')
    )
    .map(row => `| ${row} |`)
    .join('\n');
}

function buildMarkdown(ttsCreators) {
  const ttsRows = buildTtsTableRows(ttsCreators);
  const bdRows = buildBdTableRows(enrichCreators(BD_CREATORS));

  return `# ANTA 达人表飞书导出测试

> **日期**：${DATE} · **策划方**：Vidau  
> **说明**：验证达人头像本地上传、TikTok 外链、表格完整转换、表头仅加粗。不调用 MCP。

---

## 测试检查项

| 检查项 | 预期 |
| --- | --- |
| 达人头像 | 第 1 列占位符 · 替换为本地图片上传 |
| TikTok 链接 | 导出后 API 写入外链，点击跳转 tiktok.com |
| 出海匠链接 | 详情直链 /creators/{id}?country=TH（MCP id） |
| 表格行数 | TTS 表 15 行完整渲染，无裸露 Markdown |
| 表头底色 | 无填充，仅加粗 |

---

## 一、TTS 带货达人对标表

| # | 头像 | 达人昵称 | @Handle | 粉丝 | 30天GMV | 互动率 | 垂类 | 合作建议 | 出海匠链接 | TikTok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${ttsRows}

*头像本地上传；出海匠 / TikTok 列导出后通过 API 写入外链（勿在 Markdown 里写裸 URL，避免飞书误识别为文档内链）。*

> **链接说明**：出海匠详情直链格式为 https://www.chuhaijiang.com/app/discover/tiktok/creators/{id}?country=TH 。泰国市场 MCP search 返回的 id 即为详情页 id（与 TikTok UID 一致），勿用 keyword 搜索页。

---

## 二、宣发 BD 推荐名单

| # | 达人 | @Handle | 粉丝 | 垂类 | 预估报价USD | 适合SKU | 备注 | TikTok |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${bdRows}

---

## 三、格式对照（修复前 vs 修复后）

| 问题 | 修复前 | 修复后 |
| --- | --- | --- |
| 头像 | ![](https://oss-th...) 外链 | · + 本地上传 embed |
| 链接 | [链接](url) → 飞书文档内链 | API 写入 TikTok 外链 |
| 出海匠 | keyword 搜索页无结果 | /creators/{id}?country=TH 详情直链 |
| 表格断裂 | 分段截断表格第 10 行后 | splitMarkdownChunksSafe 保持表格完整 |
| 表头 | 文字背景色块 | 无底色，仅加粗 |
`;
}

async function main() {
  const exportFeishu = process.argv.includes('--export-feishu');
  let creators = enrichCreators(CREATORS);

  console.log('🔗 解析出海匠达人链接…');
  creators = await resolveChuhaijiangProfileUrls(creators, { country: 'TH' });

  console.log('📥 下载达人头像到本地…');
  const avatarDir = path.join(OUTPUT, 'chuhaijiang-assets', 'avatars', `anta-test-${DATE}`);
  creators = await downloadEntityImagesWithFallback(creators, {
    prefix: 'anta',
    urlKey: 'avatar',
    destKey: 'avatarLocal',
    dir: avatarDir,
    country: 'th'
  });

  const md = buildMarkdown(creators);
  const mdPath = path.join(OUTPUT, `ANTA-达人表飞书测试-${DATE}.md`);
  fs.writeFileSync(mdPath, md, 'utf-8');
  console.log('✅ 测试 Markdown:', mdPath);

  const embedsPath = path.join(OUTPUT, `ANTA-达人表飞书测试-embeds-${DATE}.json`);
  const embedConfig = {
    tableEmbeds: [
      {
        tableIndex: 1,
        columnIndex: 1,
        imagePaths: creators.map(c => c.avatarLocal || ''),
        options: { maxWidth: 64, maxHeight: 64 }
      }
    ],
    linkPatches: [
      {
        tableIndex: 1,
        columnIndex: 9,
        links: creators.map(c => ({ url: c.chjUrl, label: c.chjLinkLabel || '出海匠' }))
      },
      {
        tableIndex: 1,
        columnIndex: 10,
        links: creators.map(c => ({ url: c.tiktokUrl, label: `@${c.handle}` }))
      },
      {
        tableIndex: 2,
        columnIndex: 8,
        links: enrichCreators(BD_CREATORS).map(c => ({ url: c.tiktokUrl, label: `@${c.handle}` }))
      }
    ]
  };
  fs.writeFileSync(embedsPath, JSON.stringify(embedConfig, null, 2), 'utf-8');
  console.log('✅ 嵌入配置:', embedsPath);

  const metaPath = path.join(OUTPUT, `ANTA-达人表飞书测试-${DATE}.json`);
  fs.writeFileSync(metaPath, JSON.stringify({ date: DATE, creators, embedsPath, mdPath }, null, 2), 'utf-8');

  if (exportFeishu) {
    const { exportMarkdownToFeishu } = require('./feishu-export');
    const { loadEnv, ensureUserAuth } = require('./feishu-lib');
    const env = loadEnv();
    const { accessToken, auth } = await ensureUserAuth(env);
    const title = `ANTA达人表飞书导出测试 ${DATE}`;
    const result = await exportMarkdownToFeishu(md, title, env, accessToken, auth, {
      styleTableHeaders: true,
      styleDocumentTitle: true,
      tableEmbeds: embedConfig.tableEmbeds,
      linkPatches: embedConfig.linkPatches
    });
    console.log('\n✅ 飞书测试文档:', result.url);
    fs.writeFileSync(metaPath, JSON.stringify({ ...JSON.parse(fs.readFileSync(metaPath, 'utf-8')), feishuUrl: result.url }, null, 2));
  } else {
    console.log('\n下一步导出飞书:');
    console.log(`node scripts/feishu-export.js "${mdPath}" "ANTA达人表飞书导出测试" --embeds-json "${embedsPath}"`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

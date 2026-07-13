#!/usr/bin/env node
/**
 * 将 Markdown 报告导出到当前用户已授权的飞书云文档
 *
 * 用法:
 *   node scripts/feishu-export.js output/report.md
 *   node scripts/feishu-export.js output/report.md "自定义文档标题"
 *   node scripts/feishu-export.js output/report.md "标题" --charts
 *   node scripts/feishu-export.js output/report.md "标题" --charts-ai
 *
 * --charts      读取 <!-- chart --> 标记，QuickChart 优先生成并插入到对应表格后
 * --charts-ai   强制 AI 生图（gpt-image-2）
 * --all-charts  为所有含数值的表格出图（无标记时也生成）
 */

const fs = require('fs');
const path = require('path');
const {
  loadEnv,
  ensureUserAuth,
  getTenantAccessToken,
  feishuJson,
  getUserAuthStatus,
  ensureDocumentEditable,
  patchTableColumnHyperlinks,
  insertChartsIntoDocument,
  styleFeishuTableHeaders,
  styleFeishuDocumentTitle,
  embedImagesInTableColumn,
  listAllDocumentBlocks,
  listDocumentTableBlocks,
  attachChartsToTableBlocks
} = require('./feishu-lib');
const { generateChartsFromMarkdown } = require('./chart-markdown');
const { sanitizeMarkdownForFeishu } = require('./markdown-feishu-sanitize');
const { splitMarkdownChunksSafe } = require('./feishu-chunk-utils');
const { hasApiKey } = require('./ai-lib');

const INSERT_PERMISSION_HINT =
  '写入飞书文档权限不足。请：1) 在飞书开放平台确认应用已开通 docx:document、drive:drive 等用户权限并已发布；2) 运行 node scripts/feishu-auth.js --logout 后重新授权。';

function sanitizeDescendantBlock(block) {
  const sanitized = { ...block };
  delete sanitized.revision_id;
  delete sanitized.parent_id;

  if (sanitized.block_type === 31 && sanitized.table && typeof sanitized.table === 'object') {
    const table = { ...sanitized.table };
    if (table.property && typeof table.property === 'object') {
      const property = { ...table.property };
      delete property.merge_info;
      table.property = property;
    }
    sanitized.table = table;
  }

  if (!Array.isArray(sanitized.children)) {
    sanitized.children = [];
  }
  return sanitized;
}

function resolveFirstLevelBlockIds(converted, descendants) {
  if (converted.first_level_block_ids?.length) return converted.first_level_block_ids;
  const referenced = new Set();
  for (const block of descendants) {
    for (const childId of block.children || []) referenced.add(childId);
  }
  return descendants
    .map(block => String(block.block_id || ''))
    .filter(id => id && !referenced.has(id));
}

function splitMarkdownChunks(markdown) {
  return splitMarkdownChunksSafe(markdown, 8000);
}

async function convertMarkdownChunk(token, chunk) {
  return feishuJson(token, '/docx/v1/documents/blocks/convert', {
    method: 'POST',
    body: JSON.stringify({ content_type: 'markdown', content: chunk.slice(0, 900000) })
  });
}

async function convertMarkdownChunkWithFallback(env, userToken, chunk) {
  try {
    return await convertMarkdownChunk(userToken, chunk);
  } catch {
    const tenantToken = await getTenantAccessToken(env);
    return await convertMarkdownChunk(tenantToken, chunk);
  }
}

async function insertDescendantBlocks(accessToken, documentId, converted) {
  const descendants = (converted.blocks || []).map(sanitizeDescendantBlock);
  const childrenId = resolveFirstLevelBlockIds(converted, descendants);

  if (!descendants.length || !childrenId.length) {
    throw new Error('飞书文档内容为空，无法写入');
  }
  if (descendants.length > 1000) {
    throw new Error(`单段内容过长（${descendants.length} 块），请缩短表格或段落`);
  }

  await feishuJson(
    accessToken,
    `/docx/v1/documents/${documentId}/blocks/${documentId}/descendant?document_revision_id=-1`,
    {
      method: 'POST',
      body: JSON.stringify({ index: -1, children_id: childrenId, descendants })
    }
  );
}

async function createFeishuDocument(userToken, title, env) {
  const body = { title };
  if (env.FEISHU_DEFAULT_FOLDER_TOKEN) {
    body.folder_token = env.FEISHU_DEFAULT_FOLDER_TOKEN;
  }
  const created = await feishuJson(userToken, '/docx/v1/documents', {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return created.document.document_id;
}

async function exportMarkdownToFeishu(markdown, title, env, userAccessToken, auth, options = {}) {
  let charts = [];
  let content = markdown;

  if (options.withCharts) {
    console.log('📊 正在从 Markdown 标记表格生成图表（QuickChart 优先）…');
    const generated = await generateChartsFromMarkdown(markdown, {
      allTables: options.allChartTables,
      engine: options.chartEngine || 'quickchart',
      fallbackAi: options.chartFallbackAi !== false && hasApiKey(env)
    });
    charts = generated.charts;
    content = generated.markdown;
    if (charts.length) {
      console.log(`   已生成 ${charts.length} 张图表，将插入到对应表格后`);
    } else {
      console.log('   未找到 <!-- chart --> 标记的表格，跳过图表（可在表格前添加标记）');
    }
  }

  const chunks = splitMarkdownChunks(sanitizeMarkdownForFeishu(content));
  const documentId = await createFeishuDocument(userAccessToken, title, env);

  for (const chunk of chunks) {
    const converted = await convertMarkdownChunkWithFallback(env, userAccessToken, chunk);
    try {
      await insertDescendantBlocks(userAccessToken, documentId, converted);
    } catch (error) {
      throw new Error(`${error.message}\n${INSERT_PERMISSION_HINT}`);
    }
  }

  if (charts.length) {
    console.log('🖼️  正在上传图表到飞书（插入到对应表格后）…');
    const tableBlocks = await listDocumentTableBlocks(userAccessToken, documentId);
    const chartsWithAnchor = attachChartsToTableBlocks(charts, tableBlocks);
    await insertChartsIntoDocument(userAccessToken, documentId, chartsWithAnchor);
  }

  if (options.styleTableHeaders !== false) {
    console.log('🎨 正在设置表格表头加粗…');
    const styled = await styleFeishuTableHeaders(userAccessToken, documentId, {
      enabled: options.styleTableHeaders !== false
    });
    if (styled) console.log(`   已加粗 ${styled} 个表头单元格`);
  }

  if (options.styleDocumentTitle !== false) {
    console.log('🎨 正在设置大标题蓝色…');
    const titleBlock = await styleFeishuDocumentTitle(userAccessToken, documentId, {
      titleColor: options.titleColor ?? 5
    });
    if (titleBlock) console.log('   大标题已设为蓝色');
  }

  if (options.tableEmbeds?.length) {
    console.log('🖼️  正在嵌入表格头像/产品图…');
    for (const embed of options.tableEmbeds) {
      try {
        const count = await embedImagesInTableColumn(
          userAccessToken,
          documentId,
          embed.tableIndex,
          embed.columnIndex,
          embed.imagePaths,
          embed.options || {}
        );
        console.log(`   表格#${embed.tableIndex} 列${embed.columnIndex}: ${count} 张`);
      } catch (err) {
        console.warn(`   ⚠ 表格#${embed.tableIndex} 图片嵌入失败: ${err.message}`);
      }
    }
  }

  if (options.linkPatches?.length) {
    console.log('🔗 正在修复表格外链…');
    for (const patch of options.linkPatches) {
      const count = await patchTableColumnHyperlinks(
        userAccessToken,
        documentId,
        patch.tableIndex,
        patch.columnIndex,
        patch.links,
        patch.options || {}
      );
      console.log(`   表格#${patch.tableIndex} 列${patch.columnIndex}: ${count} 个外链`);
    }
  }

  const ownership = await ensureDocumentEditable(env, documentId, {
    openId: auth?.open_id,
    userAccessToken
  });

  return {
    documentId,
    url: `https://feishu.cn/docx/${documentId}`,
    title,
    chunks: chunks.length,
    charts: charts.length,
    ownership
  };
}

module.exports = { exportMarkdownToFeishu };

if (require.main === module) {
(async () => {
  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter(a => a.startsWith('--')));
  const args = argv.filter(a => !a.startsWith('--'));
  const autoAuth = !flags.has('--no-auth');

  const embedsIdx = argv.indexOf('--embeds-json');
  const embedsJsonPath = embedsIdx >= 0 ? path.resolve(argv[embedsIdx + 1]) : null;

  if (!args[0]) {
    console.log('用法: node scripts/feishu-export.js <markdown文件> [文档标题] [--charts] [--charts-ai] [--all-charts] [--embeds-json <json>] [--no-auth]');
    process.exit(0);
  }

  const filePath = path.resolve(args[0]);
  if (!fs.existsSync(filePath)) {
    console.error('文件不存在:', filePath);
    process.exit(1);
  }

  const markdown = fs.readFileSync(filePath, 'utf-8');
  const baseName = path.basename(filePath, path.extname(filePath));
  const title = args[1] || baseName.replace(/-/g, ' · ');
  const env = loadEnv();

  try {
    const before = getUserAuthStatus();
    const { accessToken, auth } = await ensureUserAuth(env, { autoAuth });
    if (!before.connected && auth?.name) {
      console.log(`✅ 已连接飞书：${auth.name}`);
    }

    console.log('📤 正在导出到你的飞书…');

    let tableEmbeds = [];
    let linkPatches = [];
    if (embedsJsonPath) {
      if (!fs.existsSync(embedsJsonPath)) {
        console.error('embeds-json 文件不存在:', embedsJsonPath);
        process.exit(1);
      }
      const embedConfig = JSON.parse(fs.readFileSync(embedsJsonPath, 'utf-8'));
      tableEmbeds = embedConfig.tableEmbeds || [];
      linkPatches = embedConfig.linkPatches || [];
      console.log(`   已加载 ${tableEmbeds.length} 组图片嵌入、${linkPatches.length} 组外链修复`);
    }

    const result = await exportMarkdownToFeishu(markdown, title, env, accessToken, auth, {
      withCharts: flags.has('--charts') || flags.has('--all-charts') || flags.has('--charts-ai'),
      allChartTables: flags.has('--all-charts'),
      chartEngine: flags.has('--charts-ai') ? 'ai' : 'quickchart',
      chartFallbackAi: !flags.has('--charts-ai') && hasApiKey(env),
      tableEmbeds,
      linkPatches
    });
    console.log('\n✅ 导出成功!');
    console.log('标题:', result.title);
    console.log('分段:', result.chunks);
    if (result.charts) console.log('图表:', result.charts);
    console.log('链接:', result.url);
    if (result.ownership?.transferred) {
      console.log('权限: 文档所有权已转移给你，可直接编辑');
    } else if (result.ownership?.granted) {
      console.log('权限: 已授予你可编辑权限');
    } else if (result.ownership?.warning) {
      console.log('权限: 未能自动确认编辑权限，若无法编辑请在飞书文档中手动申请');
    }
  } catch (err) {
    console.error('导出失败:', err.message);
    process.exit(1);
  }
})();
}

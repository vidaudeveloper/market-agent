/**
 * 飞书导出：本地 Markdown 图片不能靠 convert 拉本地文件。
 * 做法：先换成占位标记 → 文档生成后用 upload API 插到标记后。
 */
const fs = require('fs');
const path = require('path');

const MARKER_PREFIX = 'FEISHUIMG';

function resolveLocalImagePath(src, mdDir, root) {
  const cleaned = String(src || '')
    .trim()
    .replace(/^<|>$/g, '')
    .split(/\s+/)[0];
  if (!cleaned || /^https?:\/\//i.test(cleaned) || cleaned.startsWith('data:')) {
    return null;
  }
  const candidates = [
    path.isAbsolute(cleaned) ? cleaned : path.resolve(mdDir, cleaned),
    path.resolve(root, cleaned),
    path.resolve(root, 'output', cleaned),
    path.resolve(root, cleaned.replace(/^(\.\/)?output[\\/]/, '')),
    path.resolve(mdDir, cleaned.replace(/^(\.\/)?assets[\\/]/, 'assets/'))
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * @returns {{ markdown: string, images: Array<{ index:number, alt:string, path:string, marker:string, inlineTable?:boolean }> }}
 */
function extractAndReplaceLocalImages(markdown, mdDir, root) {
  const images = [];
  const lines = String(markdown || '').split('\n');
  const out = [];

  for (const line of lines) {
    if (/^\s*\|/.test(line)) {
      // 表格内不能换成多行，否则拆表；用短占位，上传时找不到标记则追加文末
      out.push(
        line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, src) => {
          const resolved = resolveLocalImagePath(src, mdDir, root);
          if (!resolved) {
            if (/^https?:\/\//i.test(String(src).trim())) return full;
            return '·';
          }
          const index = images.length;
          const marker = `${MARKER_PREFIX}${index}`;
          const title = (alt || path.basename(resolved)).trim() || marker;
          images.push({ index, alt: title, path: resolved, marker, inlineTable: true });
          return `配图${index}`;
        })
      );
      continue;
    }

    out.push(
      line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, src) => {
        const resolved = resolveLocalImagePath(src, mdDir, root);
        if (!resolved) {
          if (/^https?:\/\//i.test(String(src).trim())) return full;
          return `\n> 配图缺失：${alt || src}\n`;
        }
        const index = images.length;
        const marker = `${MARKER_PREFIX}${index}`;
        const title = (alt || path.basename(resolved)).trim() || marker;
        images.push({ index, alt: title, path: resolved, marker, inlineTable: false });
        return `\n**【配图】${title}**\n\n\`${marker}\`\n`;
      })
    );
  }

  return { markdown: out.join('\n'), images };
}

function blockPlainText(block) {
  if (!block) return '';
  const bags = [
    block.text,
    block.heading1,
    block.heading2,
    block.heading3,
    block.heading4,
    block.heading5,
    block.heading6,
    block.bullet,
    block.ordered,
    block.quote,
    block.callout
  ].filter(Boolean);
  const parts = [];
  for (const bag of bags) {
    for (const el of bag.elements || []) {
      if (el.text_run?.content) parts.push(el.text_run.content);
      if (el.mention_doc?.title) parts.push(el.mention_doc.title);
    }
  }
  return parts.join('');
}

/**
 * 按占位标记顺序，把本地图插到对应标记块之后。
 */
async function embedMarkedLocalImages(accessToken, documentId, images, helpers) {
  const {
    listAllDocumentBlocks,
    getDocumentChildrenOrder,
    insertLocalImageAfterBlock
  } = helpers;

  if (!images?.length) return { uploaded: 0, missing: 0 };

  const allBlocks = await listAllDocumentBlocks(accessToken, documentId);
  const order = await getDocumentChildrenOrder(accessToken, documentId);

  let uploaded = 0;
  let missing = 0;

  for (const img of images) {
    if (!fs.existsSync(img.path)) {
      console.warn(`   ⚠ 本地图不存在: ${img.path}`);
      missing += 1;
      continue;
    }

    let anchorId = null;
    const needles = [img.marker, `配图${img.index}`, `【配图】${img.alt}`];
    for (const blockId of order) {
      const text = blockPlainText(allBlocks[blockId]);
      if (needles.some(n => text.includes(n))) {
        anchorId = blockId;
        break;
      }
    }

    // 也在非一级子块里搜（标记可能在嵌套 text）
    if (!anchorId) {
      for (const [blockId, block] of Object.entries(allBlocks)) {
        const text = blockPlainText(block);
        if (!needles.some(n => text.includes(n))) continue;
        anchorId = order.includes(blockId)
          ? blockId
          : block.parent_id && order.includes(block.parent_id)
            ? block.parent_id
            : blockId;
        break;
      }
    }

    try {
      if (anchorId) {
        await insertLocalImageAfterBlock(accessToken, documentId, anchorId, img.path, {
          title: img.alt
        });
      } else {
        console.warn(`   ⚠ 未找到标记 ${img.marker}，改为追加文档末尾`);
        const { insertLocalImageIntoDocument } = helpers;
        await insertLocalImageIntoDocument(accessToken, documentId, img.path, { title: img.alt });
      }
      uploaded += 1;
      console.log(`   ✅ ${img.alt}`);
    } catch (err) {
      missing += 1;
      console.warn(`   ⚠ 上传失败 ${img.alt}: ${err.message}`);
    }
  }

  return { uploaded, missing };
}

module.exports = {
  MARKER_PREFIX,
  resolveLocalImagePath,
  extractAndReplaceLocalImages,
  blockPlainText,
  embedMarkedLocalImages
};

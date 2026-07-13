/**
 * 飞书 Markdown 分段：保证表格块不被从中间截断
 */

function isTableLine(line) {
  return /^\s*\|/.test(line);
}

function isTableSeparator(line) {
  return /^\s*\|[\s\-:|]+\|\s*$/.test(line);
}

/** 将 Markdown 拆成原子块（段落 / 完整表格） */
function splitMarkdownIntoBlocks(text) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let buf = [];

  const flushText = () => {
    if (buf.length) {
      blocks.push({ type: 'text', content: buf.join('\n') });
      buf = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    if (isTableLine(lines[i]) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushText();
      const tableLines = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && isTableLine(lines[i])) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'table', content: tableLines.join('\n') });
      continue;
    }
    buf.push(lines[i]);
    i++;
  }
  flushText();
  return blocks;
}

/**
 * 分段写入飞书 convert API（表格保持完整）
 * @param {number} maxChunk 单段字符上限
 */
function splitMarkdownChunksSafe(markdown, maxChunk = 8000) {
  const text = String(markdown || '').trim();
  if (!text) return ['# 暂无内容\n\n'];

  const sections = text.split(/\n(?=#{1,4} )/);
  const packed = [];

  for (const section of sections) {
    const blocks = splitMarkdownIntoBlocks(section.trim());
    let current = '';

    for (const block of blocks) {
      const piece = current ? `${current}\n\n${block.content}` : block.content;
      if (piece.length > maxChunk && current) {
        packed.push(current.trim());
        current = block.content;
      } else {
        current = piece;
      }
    }
    if (current.trim()) packed.push(current.trim());
  }

  const final = [];
  for (const chunk of packed) {
    if (chunk.length <= maxChunk) {
      final.push(chunk);
      continue;
    }
    // 超大表格单独成段；其余按块再拆
    const blocks = splitMarkdownIntoBlocks(chunk);
    let part = '';
    for (const block of blocks) {
      const next = part ? `${part}\n\n${block.content}` : block.content;
      if (next.length > maxChunk && part) {
        final.push(part.trim());
        part = block.content;
      } else if (block.content.length > maxChunk) {
        if (part.trim()) final.push(part.trim());
        final.push(block.content);
        part = '';
      } else {
        part = next;
      }
    }
    if (part.trim()) final.push(part.trim());
  }

  return final.length ? final : [text];
}

function sanitizeTableCell(value) {
  return String(value ?? '—')
    .replace(/\|/g, '/')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '—';
}

module.exports = {
  splitMarkdownIntoBlocks,
  splitMarkdownChunksSafe,
  sanitizeTableCell
};

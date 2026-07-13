/**
 * 飞书 docx Markdown 转换前清理
 * 飞书会把 $...$ 渲染为公式体，导致金额显示异常
 */

const PYRAMID_TABLE = `| 层级 | 定位 | 规模 | 核心作用 |
| --- | --- | --- | --- |
| 第一层 | 头/腰部大V | 少量 | 高曝光、强背书、破圈 |
| 第二层 | 腰部中V | 主力 | 高性价比、精准种草、垂类覆盖 |
| 第三层 | 微型/超微 KOL | 批量 | 口碑铺量、真实 UGC、长尾触达 |`;

function sanitizeMarkdownForFeishu(text) {
  if (!text) return text;

  let t = text.replace(
    /[ \t]*[┌└┐┘│─┬┴├┤▼]+[\s\S]*?微型\/超微 KOL[\s\S]*?[┘┐][^\n]*/g,
    PYRAMID_TABLE
  );

  const lines = t.split('\n');
  const out = [];

  for (const line of lines) {
    if (line.trim().startsWith('```') || /^\s*\|/.test(line)) {
      if (/^\s*\|/.test(line)) {
        let row = line
          .replace(/ \\ \| /g, ' · ')
          .replace(/\\\s*\|/g, ' · ')
          .replace(/\\/g, '');

        // 表格内：外链图片 → 占位符（飞书无法直接拉取出海匠 CDN，改由 embedImages 上传）
        row = row.replace(/!\[[^\]]*\]\([^)]+\)/g, '·');

        // 表格内：Markdown 链接 → 裸 URL（避免飞书渲染成 mention_doc 指向当前文档）
        row = row.replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '$2');

        // 表格内：去掉加粗/斜体标记，防止 convert 解析异常
        row = row.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

        out.push(row);
      } else {
        out.push(line);
      }
      continue;
    }

    // 去掉框线字符行（飞书会渲染成乱码表）
    if (/[┌└┐┘│─┬┴├┤▼]/.test(line)) continue;

    let s = line;
    s = s.replace(/\$\s*([\d,]+(?:\.\d+)?)\s*万/g, '$1 万美元');

    // $50K/月 → USD 50K/月
    s = s.replace(/\$\s*([\d,]+(?:\.\d+)?)\s*K/gi, 'USD $1K');

    // 其余 $数字 → USD 数字（去掉 $ 避免公式）
    s = s.replace(/\$\s*([\d,]+(?:\.\d+)?)/g, 'USD $1');

    // 正文纯数字/百分比加粗 → 普通文本（保留小标题 **结论** 等中文标签）
    s = s.replace(
      /\*\*([^*\n]{0,40}?[\d,+%\.≤≥KMT][^*\n]{0,40}?)\*\*/g,
      '$1'
    );

    out.push(s);
  }

  return out.join('\n');
}

module.exports = { sanitizeMarkdownForFeishu };

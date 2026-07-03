/**
 * 飞书 docx Markdown 转换前清理
 * 飞书会把 $...$ 渲染为公式体，导致金额显示异常
 */

function sanitizeMarkdownForFeishu(text) {
  if (!text) return text;

  const lines = text.split('\n');
  const out = [];

  for (const line of lines) {
    if (line.trim().startsWith('```') || /^\s*\|/.test(line)) {
      out.push(line);
      continue;
    }

    let s = line;

    // $500 万 / $500万 → 500 万美元
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

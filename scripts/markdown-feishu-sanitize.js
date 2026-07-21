/**
 * 飞书 docx Markdown 转换前清理
 * 飞书会把 $...$ 渲染为公式体，导致金额/下标显示异常
 */

const PYRAMID_TABLE = `| 层级 | 定位 | 规模 | 核心作用 |
| --- | --- | --- | --- |
| 第一层 | 头/腰部大V | 少量 | 高曝光、强背书、破圈 |
| 第二层 | 腰部中V | 主力 | 高性价比、精准种草、垂类覆盖 |
| 第三层 | 微型/超微 KOL | 批量 | 口碑铺量、真实 UGC、长尾触达 |`;

/** 把货币 $ 与残留 $ 变成不会触发公式的写法（必须用函数替换，避免 $1/$2 模板吞数字） */
function neutralizeCurrencyAndDollars(s) {
  let t = String(s);
  // $10.2 万 → 10.2 万美元
  t = t.replace(/\$\s*([\d,]+(?:\.\d+)?)\s*万/g, (_, n) => `${n} 万美元`);
  // $50K → USD 50K
  t = t.replace(/\$\s*([\d,]+(?:\.\d+)?)\s*K\b/gi, (_, n) => `USD ${n}K`);
  // $1.53M / $2.34M
  t = t.replace(/\$\s*([\d,]+(?:\.\d+)?)\s*M\b/gi, (_, n) => `USD ${n}M`);
  // $190–$230 / $98-$110（先处理成对，再处理单个）
  t = t.replace(
    /\$\s*([\d,]+(?:\.\d+)?)\s*[–—-]\s*\$\s*([\d,]+(?:\.\d+)?)/g,
    (_, a, b) => `USD ${a}–${b}`
  );
  // 其余 $数字 → USD 数字
  t = t.replace(/\$\s*([\d,]+(?:\.\d+)?)/g, (_, n) => `USD ${n}`);
  // 残留 $（避免成对触发公式）→ 全角
  t = t.replace(/\$/g, '＄');
  return t;
}

/** 降低下划线被当成 LaTeX 下标的概率（标识符 gmv_30d 等） */
function neutralizeUnderscores(s) {
  // 仅处理「字母/数字_字母/数字」技术标识
  return String(s).replace(/([A-Za-z0-9])_([A-Za-z0-9])/g, (_, a, b) => `${a}-${b}`);
}

function sanitizeTableRow(line) {
  let row = line
    .replace(/ \\ \| /g, ' · ')
    .replace(/\\\s*\|/g, ' · ')
    .replace(/\\/g, '');

  // 表格内：外链图片 → 占位符
  row = row.replace(/!\[[^\]]*\]\([^)]+\)/g, '·');

  // 表格内：Markdown 链接 → 裸 URL
  row = row.replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '$2');

  // 表格内：去掉加粗/斜体标记
  row = row.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

  row = neutralizeCurrencyAndDollars(row);
  row = neutralizeUnderscores(row);
  return row;
}

function sanitizeMarkdownForFeishu(text) {
  if (!text) return text;

  let t = text.replace(
    /[ \t]*[┌└┐┘│─┬┴├┤▼]+[\s\S]*?微型\/超微 KOL[\s\S]*?[┘┐][^\n]*/g,
    PYRAMID_TABLE
  );

  const lines = t.split('\n');
  const out = [];
  let inCodeFence = false;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeFence = !inCodeFence;
      out.push(line);
      continue;
    }

    if (inCodeFence) {
      // 代码块内仍去掉 $，避免飞书公式；保留下划线
      out.push(neutralizeCurrencyAndDollars(line));
      continue;
    }

    if (/^\s*\|/.test(line)) {
      out.push(sanitizeTableRow(line));
      continue;
    }

    // 去掉框线字符行
    if (/[┌└┐┘│─┬┴├┤▼]/.test(line)) continue;

    let s = line;
    s = neutralizeCurrencyAndDollars(s);

    // 正文纯数字/百分比加粗 → 普通文本（保留小标题等中文标签）
    s = s.replace(
      /\*\*([^*\n]{0,40}?[\d,+%\.≤≥KMT][^*\n]{0,40}?)\*\*/g,
      '$1'
    );

    // 行内代码里的标识符下划线：`gmv_30d` → `gmv-30d`
    s = s.replace(/`([^`]+)`/g, (_, code) => `\`${neutralizeUnderscores(code)}\``);

    out.push(s);
  }

  return out.join('\n');
}

module.exports = {
  sanitizeMarkdownForFeishu,
  neutralizeCurrencyAndDollars,
  neutralizeUnderscores
};

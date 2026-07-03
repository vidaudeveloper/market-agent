#!/usr/bin/env node
/**
 * 读取飞书云文档 / Wiki 并导出为 Markdown（使用本机 OAuth 用户权限）
 *
 * 用法:
 *   node scripts/feishu-read-doc.js --url "https://xxx.feishu.cn/docx/AbCdEf..."
 *   node scripts/feishu-read-doc.js --doc AbCdEf1234567890
 *   node scripts/feishu-read-doc.js --batch templates/feishu-reference-urls.txt
 *   node scripts/feishu-read-doc.js --url "..." --output templates/reference/custom.md
 *
 * 首次使用若报权限错误，请重新授权（新增了 docs:document.content:read）:
 *   node scripts/feishu-auth.js --logout
 *   node scripts/feishu-auth.js
 */

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  loadEnv,
  ensureUserAuth,
  readFeishuDocument,
  slugifyTitle
} = require('./feishu-lib');

const DEFAULT_OUT_DIR = path.join(ROOT, 'templates', 'reference');

function parseArgs(argv) {
  const args = { urls: [], docs: [], batch: null, output: null, outDir: DEFAULT_OUT_DIR };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url' && argv[i + 1]) args.urls.push(argv[++i]);
    else if (a === '--doc' && argv[i + 1]) args.docs.push(argv[++i]);
    else if (a === '--batch' && argv[i + 1]) args.batch = argv[++i];
    else if (a === '--output' && argv[i + 1]) args.output = argv[++i];
    else if (a === '--out-dir' && argv[i + 1]) args.outDir = path.resolve(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function loadBatchFile(filePath) {
  return fs
    .readFileSync(path.resolve(filePath), 'utf-8')
    .split('\n')
    .map(line => line.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

async function saveDocument(result, outDir, explicitOutput) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const fileName = explicitOutput
    ? path.resolve(explicitOutput)
    : path.join(outDir, `${slugifyTitle(result.title, result.documentId)}.md`);

  fs.writeFileSync(fileName, result.markdown, 'utf-8');
  return fileName;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`用法:
  node scripts/feishu-read-doc.js --url <飞书链接> [--output path.md]
  node scripts/feishu-read-doc.js --doc <document_id>
  node scripts/feishu-read-doc.js --batch templates/feishu-reference-urls.txt

说明:
  - 使用本机 auth/feishu-user.json 的用户权限读取，不是 WebFetch
  - 支持 docx 链接与 wiki 链接（wiki 会自动解析为 docx token）
  - 默认保存到 templates/reference/`);
    process.exit(0);
  }

  let inputs = [...args.urls, ...args.docs];
  if (args.batch) inputs.push(...loadBatchFile(args.batch));

  if (!inputs.length) {
    console.error('请提供 --url、--doc 或 --batch');
    process.exit(1);
  }

  const env = loadEnv();
  const { accessToken } = await ensureUserAuth(env, { autoAuth: true });

  console.log(`\n📥 读取 ${inputs.length} 个飞书文档…\n`);

  const saved = [];
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const singleOutput = inputs.length === 1 ? args.output : null;
    console.log(`→ [${i + 1}/${inputs.length}] ${input}`);
    try {
      const result = await readFeishuDocument(accessToken, input);
      const filePath = await saveDocument(result, args.outDir, singleOutput);
      saved.push({ input, filePath, title: result.title, format: result.format });
      console.log(`   ✓ ${result.title}`);
      console.log(`   ✓ ${filePath} (${result.format}, ${(result.markdown.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`   ✗ 失败: ${err.message}`);
      if (/999916|permission|scope|403|无权|forbidden/i.test(err.message)) {
        console.error('   提示: 请 node scripts/feishu-auth.js --logout 后重新授权，并确认飞书应用已开通 docs:document.content:read');
      }
    }
  }

  console.log(`\n✅ 完成，成功 ${saved.length}/${inputs.length} 个\n`);
  if (!saved.length) process.exit(1);
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌', err.message || err);
    process.exit(1);
  });
}

module.exports = { parseArgs, saveDocument };

#!/usr/bin/env node
/**
 * 配置出海匠开放平台 MCP（HTTP + X-API-Key）
 * - Cursor: 合并到 ~/.cursor/mcp.json
 * - Hermes: 合并到 ~/.hermes/config.yaml 的 mcp_servers.chuhaijiang
 *
 * 用法:
 *   node scripts/install-chuhaijiang-open-mcp.js
 *   node scripts/install-chuhaijiang-open-mcp.js --api-key sk_live_xxx
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { mergeMcpJson } = require('./merge-mcp-json');

const CHJ_URL = 'https://mcp.gateway.chuhaijiang.com/mcp';
const SERVER_NAME = 'chuhaijiang';

function parseApiKey(argv) {
  const idx = argv.indexOf('--api-key');
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1].trim();
  return (process.env.CHUHAIJIANG_API_KEY || '').trim();
}

function patchHermesYaml(configPath, apiKey) {
  const headerBlock = apiKey
    ? `      X-API-Key: "${apiKey}"`
    : `      X-API-Key: "在此粘贴_sk_live_开头的Key"`;

  const block = `  ${SERVER_NAME}:
    url: "${CHJ_URL}"
    headers:
${headerBlock}
    timeout: 300
`;

  let text = '';
  if (fs.existsSync(configPath)) {
    text = fs.readFileSync(configPath, 'utf-8');
  } else {
    text = '# Hermes MCP 配置（由 install-chuhaijiang-open-mcp.js 生成）\nmcp_servers:\n';
  }

  if (!/mcp_servers\s*:/m.test(text)) {
    text = text.trimEnd() + '\n\nmcp_servers:\n';
  }

  const re = new RegExp(`  ${SERVER_NAME}:[\\s\\S]*?(?=\\n  [a-zA-Z0-9_-]+:|$)`, 'm');
  if (re.test(text)) {
    text = text.replace(re, block.trimEnd() + '\n');
  } else {
    if (!text.endsWith('\n')) text += '\n';
    text += block;
  }

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, text, 'utf-8');
  return configPath;
}

function main() {
  const apiKey = parseApiKey(process.argv);
  const home = os.homedir();

  const cursorMcp = path.join(home, '.cursor', 'mcp.json');
  const hermesYaml = path.join(home, '.hermes', 'config.yaml');

  const chjConfig = {
    type: 'http',
    url: CHJ_URL,
    headers: {
      'X-API-Key': apiKey || '在此粘贴_sk_live_开头的Key'
    },
    disabled: false
  };

  const cursorPath = mergeMcpJson(cursorMcp, SERVER_NAME, chjConfig);
  const hermesPath = patchHermesYaml(hermesYaml, apiKey);

  console.log('✅ 出海匠开放平台 MCP 已写入:');
  console.log('   Cursor:', cursorPath);
  console.log('   Hermes:', hermesPath);

  if (!apiKey) {
    console.log('\n⚠ 尚未填入 API Key。请：');
    console.log('   1. 登录 https://developer.chuhaijiang.com 创建 sk_live_ 密钥');
    console.log('   2. 重新运行: node scripts/install-chuhaijiang-open-mcp.js --api-key sk_live_xxx');
    console.log('   或手动改上述文件中的 X-API-Key');
  } else {
    console.log('\n下一步验证:');
    console.log('   Hermes: /reload-mcp 后让 Agent 调用 account_info');
    console.log('   Cursor: 重启后调用出海匠 MCP 的 account_info');
  }

  console.log('\n配置说明见 skillhub 安装的 chuhaijiang 技能 references/setup.md');
}

main();

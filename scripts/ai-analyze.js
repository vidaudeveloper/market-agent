#!/usr/bin/env node
/**
 * 通用 AI 分析工具
 * 读取 .env 中的 AI API 配置，调用 LLM 进行文本分析
 *
 * 用法:
 *   node scripts/ai-analyze.js "分析这段文案的营销效果: ..."
 *   node scripts/ai-analyze.js --file input.txt
 */

const fs = require('fs');
const path = require('path');

// Load .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    console.error('未找到 .env 文件，请先复制 .env.example 并填入配置');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) return;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  });
  return env;
}

async function callAI(prompt, env) {
  const apiKey = env.AI_API_KEY;
  const baseUrl = env.AI_BASE_URL || 'https://api.openai.com/v1';
  const model = env.AI_MODEL || 'gpt-4o-mini';
  const timeout = parseInt(env.AI_TIMEOUT) || 60000;

  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    console.error('请在 .env 中填写有效的 AI_API_KEY');
    process.exit(1);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一个专业的市场营销分析助手。请用中文回答。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    }),
    signal: controller.signal
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '（无返回内容）';
}

// Main
(async () => {
  const args = process.argv.slice(2);
  let prompt;

  if (args[0] === '--file') {
    if (!args[1]) { console.error('请提供文件路径'); process.exit(1); }
    prompt = fs.readFileSync(args[1], 'utf-8');
  } else {
    prompt = args.join(' ');
  }

  if (!prompt) {
    console.log('用法:');
    console.log('  node scripts/ai-analyze.js "你的分析提示"');
    console.log('  node scripts/ai-analyze.js --file input.txt');
    process.exit(0);
  }

  const env = loadEnv();
  console.log('🤖 AI 分析中...');
  try {
    const result = await callAI(prompt, env);
    console.log('\n' + result);
  } catch (err) {
    console.error('分析失败:', err.message);
    process.exit(1);
  }
})();

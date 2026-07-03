/**
 * AI API 共享库（文本 + 图片生成）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  fs.readFileSync(filePath, 'utf-8').split('\n').forEach(line => {
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

function loadEnv() {
  return loadEnvFile(path.join(ROOT, '.env'));
}

function requireApiKey(env) {
  const apiKey = env.AI_API_KEY;
  if (!apiKey || apiKey === 'sk-your-api-key-here' || apiKey === '在此填入你的API密钥') {
    throw new Error('请在 .env 中填写有效的 AI_API_KEY');
  }
  return apiKey;
}

function slugify(text) {
  return String(text || 'chart')
    .trim()
    .slice(0, 48)
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'chart';
}

async function downloadToBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载图片失败 (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * 调用 OpenAI 兼容 /images/generations 接口
 */
async function generateImage(prompt, env, options = {}) {
  const apiKey = requireApiKey(env);
  const baseUrl = (env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = options.model || env.AI_IMAGE_MODEL || 'gpt-image-2';
  const size = options.size || env.AI_IMAGE_SIZE || '1024x1024';
  const timeout = parseInt(options.timeout || env.AI_IMAGE_TIMEOUT || env.AI_TIMEOUT || '120000', 10);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        prompt,
        size,
        n: 1
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`图片 API 请求失败 (${response.status}): ${raw.slice(0, 400)}`);
    }

    const data = JSON.parse(raw);
    const item = data.data?.[0];
    if (!item) throw new Error('图片 API 未返回 data[0]');

    let buffer;
    if (item.b64_json) {
      buffer = Buffer.from(item.b64_json, 'base64');
    } else if (item.url) {
      buffer = await downloadToBuffer(item.url);
    } else {
      throw new Error('图片 API 返回格式不支持（无 url / b64_json）');
    }

    return { buffer, model, size, url: item.url || null };
  } finally {
    clearTimeout(timer);
  }
}

function saveImageBuffer(buffer, filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = {
  ROOT,
  loadEnv,
  requireApiKey,
  slugify,
  generateImage,
  saveImageBuffer
};

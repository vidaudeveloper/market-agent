/**
 * 飞书 OAuth + 导出共享库（方案 A：本地授权，无 Web 页面）
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FEISHU_OPEN_BASE = 'https://open.feishu.cn/open-apis';
const FEISHU_AUTH_BASE = 'https://accounts.feishu.cn/open-apis/authen/v1';
const DEFAULT_CALLBACK_PORT = 8787;
const DEFAULT_CALLBACK_PATH = '/api/auth/feishu/callback';
const USER_AUTH_FILE = path.join(ROOT, 'auth', 'feishu-user.json');

const FEISHU_OAUTH_SCOPES = [
  'contact:user.base:readonly',
  'drive:drive',
  'drive:drive:readonly',
  'docx:document',
  'docx:document:create',
  'docx:document:readonly',
  'docx:document.block:convert',
  'docs:document.content:read',
  'wiki:wiki',
  'wiki:wiki:readonly'
].join(' ');

let cachedTenantToken = null;

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

function getFeishuAppId(env) {
  const appId = (env.FEISHU_APP_ID || '').trim();
  if (!appId) throw new Error('请在 .env 中配置 FEISHU_APP_ID（见 FEISHU-APP-SETUP.md）');
  return appId;
}

function getFeishuAppSecret(env) {
  const appSecret = (env.FEISHU_APP_SECRET || '').trim();
  if (!appSecret) throw new Error('请在 .env 中配置 FEISHU_APP_SECRET（见 FEISHU-APP-SETUP.md）');
  return appSecret;
}

function isFeishuConfigured(env) {
  const e = env || loadEnv();
  const id = (e.FEISHU_APP_ID || '').trim();
  const secret = (e.FEISHU_APP_SECRET || '').trim();
  if (!id || !secret) return false;
  if (id.includes('在此填入') || secret.includes('在此填入')) return false;
  return id.startsWith('cli_') && secret.length >= 8;
}

function getRedirectUri(env) {
  if (env.FEISHU_REDIRECT_URI) return env.FEISHU_REDIRECT_URI;
  const port = env.FEISHU_CALLBACK_PORT || DEFAULT_CALLBACK_PORT;
  return `http://127.0.0.1:${port}${DEFAULT_CALLBACK_PATH}`;
}

function ensureAuthDir() {
  const dir = path.dirname(USER_AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readUserAuth() {
  if (!fs.existsSync(USER_AUTH_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(USER_AUTH_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeUserAuth(payload) {
  ensureAuthDir();
  fs.writeFileSync(USER_AUTH_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

function deleteUserAuth() {
  if (fs.existsSync(USER_AUTH_FILE)) fs.unlinkSync(USER_AUTH_FILE);
}

function isAccessTokenValid(auth) {
  if (!auth?.access_token || !auth?.expires_at) return false;
  return auth.expires_at > Date.now() + 60_000;
}

async function feishuJson(accessToken, apiPath, init) {
  const response = await fetch(`${FEISHU_OPEN_BASE}${apiPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init?.headers || {})
    }
  });
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(data.msg || `飞书 API 错误 (${data.code})`);
  }
  return data.data;
}

async function requestFeishuUserToken(env, body, redirectUri) {
  const payload = {
    ...body,
    client_id: getFeishuAppId(env),
    client_secret: getFeishuAppSecret(env)
  };
  if (redirectUri) payload.redirect_uri = redirectUri;

  const response = await fetch(`${FEISHU_OPEN_BASE}/authen/v2/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return response.json();
}

function mapTokenPayload(data) {
  if (data.code !== 0 || !data.access_token) {
    throw new Error(data.error_description || data.error || data.msg || '飞书授权失败');
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 7200) * 1000,
    refresh_expires_at: data.refresh_token_expires_in
      ? Date.now() + data.refresh_token_expires_in * 1000
      : null
  };
}

async function fetchUserInfo(accessToken) {
  const response = await fetch(`${FEISHU_OPEN_BASE}/authen/v1/user_info`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (data.code !== 0) return null;
  return data.data;
}

async function exchangeFeishuCode(env, code, redirectUri) {
  const data = await requestFeishuUserToken(env, {
    grant_type: 'authorization_code',
    code
  }, redirectUri);
  return mapTokenPayload(data);
}

async function refreshFeishuToken(env, refreshToken) {
  const data = await requestFeishuUserToken(env, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });
  return mapTokenPayload(data);
}

async function saveOAuthResult(env, tokenPayload) {
  const userInfo = await fetchUserInfo(tokenPayload.access_token);
  const saved = {
    ...tokenPayload,
    open_id: userInfo?.open_id || null,
    name: userInfo?.name || null,
    avatar_url: userInfo?.avatar_url || userInfo?.avatar_thumb || null,
    updated_at: new Date().toISOString()
  };
  writeUserAuth(saved);
  return saved;
}

async function getTenantAccessToken(env) {
  if (cachedTenantToken && cachedTenantToken.expiresAt > Date.now() + 60_000) {
    return cachedTenantToken.token;
  }

  const response = await fetch(`${FEISHU_OPEN_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      app_id: getFeishuAppId(env),
      app_secret: getFeishuAppSecret(env)
    })
  });
  const data = await response.json();
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(data.msg || '无法获取飞书 tenant_access_token');
  }

  cachedTenantToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire || 7200) * 1000
  };
  return cachedTenantToken.token;
}

async function getValidUserAccessToken(env) {
  const auth = readUserAuth();
  if (!auth) return null;

  if (isAccessTokenValid(auth)) {
    return auth.access_token;
  }

  if (!auth.refresh_token) return null;

  try {
    const refreshed = await refreshFeishuToken(env, auth.refresh_token);
    const saved = await saveOAuthResult(env, {
      ...refreshed,
      refresh_token: refreshed.refresh_token || auth.refresh_token
    });
    return saved.access_token;
  } catch {
    return null;
  }
}

function buildAuthorizeUrl(env, state) {
  const params = new URLSearchParams({
    client_id: getFeishuAppId(env),
    response_type: 'code',
    redirect_uri: getRedirectUri(env),
    scope: FEISHU_OAUTH_SCOPES,
    state,
    prompt: 'consent'
  });
  return `${FEISHU_AUTH_BASE}/authorize?${params.toString()}`;
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    // 优先 rundll32：完整保留 URL 中的 &，且比 PowerShell 更易唤起默认浏览器
    try {
      execSync(`rundll32 url.dll,FileProtocolHandler "${url}"`, { stdio: 'ignore', windowsHide: true });
      return;
    } catch {
      // 继续 fallback
    }
    try {
      // cmd start 需把 URL 作为独立参数，避免 & 被截断
      execSync(`cmd /c start "" "${url}"`, { stdio: 'ignore', windowsHide: true });
      return;
    } catch {
      // 继续 fallback
    }
    try {
      const escaped = url.replace(/'/g, "''");
      execSync(`powershell -NoProfile -Command "Start-Process '${escaped}'"`, { stdio: 'ignore', windowsHide: true });
      return;
    } catch {
      // 所有方式都失败
    }
    return;
  }
  if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
      const pids = new Set();
      for (const line of output.split('\n')) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
      }
      for (const pid of pids) {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`   已释放端口 ${port}（结束进程 PID ${pid}）`);
      }
      return;
    }

    execSync(`lsof -ti:${port} | xargs -r kill -9`, { stdio: 'ignore' });
  } catch {
    // 端口未被占用或无法自动释放，后续 listen 会给出明确错误
  }
}

function listenOAuthServer(server, port) {
  killProcessOnPort(port);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
}

function successHtml(name) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>飞书授权成功</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f5f7fa}
.card{background:#fff;padding:32px 40px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.08);text-align:center;max-width:420px}
h1{color:#1f2329;font-size:22px}p{color:#646a73;line-height:1.6}</style></head>
<body><div class="card"><h1>✅ 飞书授权成功</h1><p>${name ? `已连接：${name}` : '已连接你的飞书账号'}<br>可以关闭此页面，回到终端或 AI 助手继续操作。</p></div></body></html>`;
}

function errorHtml(message) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>飞书授权失败</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fff5f5}
.card{background:#fff;padding:32px 40px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.08);text-align:center;max-width:480px}
h1{color:#d83931;font-size:22px}p{color:#646a73;line-height:1.6;white-space:pre-wrap}</style></head>
<body><div class="card"><h1>❌ 飞书授权失败</h1><p>${message}</p></div></body></html>`;
}

function runOAuthFlow(env, options = {}) {
  const redirectUri = getRedirectUri(env);
  const port = Number(new URL(redirectUri).port || DEFAULT_CALLBACK_PORT);
  const state = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const timeoutMs = options.timeoutMs || 5 * 60 * 1000;

  return new Promise((resolve, reject) => {
    let settled = false;
    let server;

    const cleanup = () => {
      clearTimeout(timer);
      if (server) {
        try { server.close(); } catch {}
      }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('飞书授权超时（5 分钟），请重试'));
    }, timeoutMs);

    server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, redirectUri);
        if (url.pathname !== DEFAULT_CALLBACK_PATH) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }

        const error = url.searchParams.get('error');
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(errorHtml(`飞书返回错误：${error}`));
          throw new Error(`飞书授权被拒绝：${error}`);
        }

        if (!code || returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(errorHtml('授权回调参数无效，请重新发起授权。'));
          throw new Error('飞书授权回调参数无效');
        }

        const tokenPayload = await exchangeFeishuCode(env, code, redirectUri);
        const saved = await saveOAuthResult(env, tokenPayload);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(successHtml(saved.name));

        if (!settled) {
          settled = true;
          cleanup();
          resolve(saved);
        }
      } catch (err) {
        if (!settled) {
          settled = true;
          cleanup();
          reject(err);
        }
      }
    });

    listenOAuthServer(server, port)
      .then(() => {
        const authUrl = buildAuthorizeUrl(env, state);
      console.log('🔗 正在打开飞书授权页…');
      console.log(`   回调地址：${redirectUri}`);
      openBrowser(authUrl);
      console.log('   若浏览器未自动弹出，请复制下方链接到浏览器打开：');
      console.log(`   ${authUrl}`);
      })
      .catch(err => {
        if (settled) return;
        settled = true;
        cleanup();
        const hint = err.code === 'EADDRINUSE'
          ? `\n   端口 ${port} 仍被占用，请关闭其他 feishu-auth 窗口后重试，或执行：\n   netstat -ano | findstr :${port}\n   taskkill /PID <PID> /F`
          : '';
        reject(new Error(`无法启动本地回调服务 (${port})：${err.message}${hint}`));
      });
  });
}

async function ensureUserAuth(env, options = {}) {
  const existing = await getValidUserAccessToken(env);
  if (existing) {
    const auth = readUserAuth();
    return { accessToken: existing, auth };
  }

  if (options.autoAuth === false) {
    throw new Error('未连接飞书。请先运行：node scripts/feishu-auth.js');
  }

  console.log('📎 尚未连接飞书，即将打开浏览器完成授权…');
  const saved = await runOAuthFlow(env, options);
  return { accessToken: saved.access_token, auth: saved };
}

function getUserAuthStatus() {
  const auth = readUserAuth();
  if (!auth) {
    return { connected: false, name: null, expires_at: null };
  }
  return {
    connected: isAccessTokenValid(auth) || !!auth.refresh_token,
    name: auth.name || null,
    open_id: auth.open_id || null,
    expires_at: auth.expires_at ? new Date(auth.expires_at).toISOString() : null,
    updated_at: auth.updated_at || null
  };
}

/**
 * 确保 OAuth 用户对导出文档有可编辑权限（转移所有者，必要时授予 full_access）
 */
async function ensureDocumentEditable(env, documentId, { openId, userAccessToken }) {
  if (!openId) {
    return { transferred: false, granted: false, warning: 'missing_open_id' };
  }

  const transferPath = `/drive/v1/permissions/${documentId}/members/transfer_owner?type=docx`;
  const transferBody = JSON.stringify({
    member_type: 'openid',
    member_id: openId
  });
  const memberPath = `/drive/v1/permissions/${documentId}/members?type=docx&need_notification=false`;
  const memberBody = JSON.stringify({
    member_type: 'openid',
    member_id: openId,
    perm: 'full_access'
  });

  const tokenSources = [
    () => getTenantAccessToken(env),
    async () => userAccessToken
  ];

  for (const getToken of tokenSources) {
    try {
      const token = await getToken();
      await feishuJson(token, transferPath, { method: 'POST', body: transferBody });
      return { transferred: true, granted: false };
    } catch {
      // 继续尝试下一身份
    }
  }

  for (const getToken of tokenSources) {
    try {
      const token = await getToken();
      await feishuJson(token, memberPath, { method: 'POST', body: memberBody });
      return { transferred: false, granted: true };
    } catch {
      // 继续尝试下一身份
    }
  }

  return { transferred: false, granted: false, warning: 'permission_api_failed' };
}

async function feishuRawRequest(accessToken, apiPath, init) {
  const response = await fetch(`${FEISHU_OPEN_BASE}${apiPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {})
    }
  });
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(data.msg || `飞书 API 错误 (${data.code})`);
  }
  return data.data;
}

/**
 * 读取 PNG 原始尺寸（IHDR）
 */
function readPngDimensions(buffer) {
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('不是有效的 PNG 文件');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readJpegDimensions(buffer) {
  let i = 2;
  while (i < buffer.length) {
    if (buffer[i] !== 0xff) break;
    const marker = buffer[i + 1];
    const len = buffer.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function readImageDimensions(buffer) {
  try {
    return readPngDimensions(buffer);
  } catch {
    const jpeg = readJpegDimensions(buffer);
    if (jpeg) return jpeg;
    return { width: 120, height: 120 };
  }
}

/**
 * 按最大宽度等比缩放，用于飞书 replace_image
 */
function fitImageDimensions(naturalWidth, naturalHeight, maxWidth = 680) {
  if (!naturalWidth || !naturalHeight) {
    return { width: maxWidth, height: maxWidth };
  }
  if (naturalWidth <= maxWidth) {
    return { width: naturalWidth, height: naturalHeight };
  }
  const scale = maxWidth / naturalWidth;
  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale)
  };
}

function buildReplaceImageBody(fileToken, imagePath, options = {}) {
  const fs = require('fs');
  const buffer = fs.readFileSync(imagePath);
  const natural = readImageDimensions(buffer);
  const maxWidth = options.width || options.maxWidth || 680;
  const fitted = fitImageDimensions(natural.width, natural.height, maxWidth);

  const body = {
    replace_image: {
      token: fileToken,
      width: options.exactWidth || fitted.width,
      height: options.exactHeight || fitted.height
    }
  };
  return { body, buffer, dimensions: fitted, natural };
}

async function uploadImageToBlock(accessToken, documentId, imageBlockId, imagePath, options = {}) {
  const path = require('path');
  const { body, buffer } = buildReplaceImageBody('', imagePath, options);
  const fileName = path.basename(imagePath);

  const form = new FormData();
  form.append('file_name', fileName);
  form.append('parent_type', 'docx_image');
  form.append('parent_node', imageBlockId);
  form.append('size', String(buffer.length));
  form.append('extra', JSON.stringify({ drive_route_token: documentId }));
  form.append('file', new Blob([buffer]), fileName);

  let uploadData;
  let uploadAttempts = 0;
  const maxUploadAttempts = 3;
  while (uploadAttempts < maxUploadAttempts) {
    uploadAttempts++;
    try {
      uploadData = await feishuRawRequest(accessToken, '/drive/v1/medias/upload_all', {
        method: 'POST',
        body: form
      });
      break;
    } catch (err) {
      if (uploadAttempts >= maxUploadAttempts) {
        throw new Error(`上传图片素材失败（已重试 ${maxUploadAttempts} 次）: ${err.message}`);
      }
      console.log(`   上传重试 ${uploadAttempts}/${maxUploadAttempts}: ${err.message}`);
      await new Promise(r => setTimeout(r, 500 * uploadAttempts));
    }
  }

  const fileToken = uploadData.file_token;
  if (!fileToken) {
    throw new Error('上传飞书图片素材失败（无 file_token）');
  }

  body.replace_image.token = fileToken;

  let replaceAttempts = 0;
  const maxReplaceAttempts = 3;
  while (replaceAttempts < maxReplaceAttempts) {
    replaceAttempts++;
    try {
      await feishuJson(
        accessToken,
        `/docx/v1/documents/${documentId}/blocks/${imageBlockId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(body)
        }
      );
      break;
    } catch (err) {
      if (replaceAttempts >= maxReplaceAttempts) {
        throw new Error(`替换图片块失败（已重试 ${maxReplaceAttempts} 次）: ${err.message}`);
      }
      console.log(`   替换重试 ${replaceAttempts}/${maxReplaceAttempts}: ${err.message}`);
      await new Promise(r => setTimeout(r, 500 * replaceAttempts));
    }
  }

  return {
    blockId: imageBlockId,
    fileToken,
    width: body.replace_image.width,
    height: body.replace_image.height
  };
}

/**
 * 替换已有图片块内容（刷新图表时使用）
 */
async function replaceImageInBlock(accessToken, documentId, imageBlockId, imagePath, options = {}) {
  const fs = require('fs');
  if (!fs.existsSync(imagePath)) {
    throw new Error(`图片不存在: ${imagePath}`);
  }
  return uploadImageToBlock(accessToken, documentId, imageBlockId, imagePath);
}

/**
 * 上传图片到飞书云文档的图片块
 * 流程：创建 image block → upload_all → replace_image
 */
async function insertLocalImageIntoDocument(accessToken, documentId, imagePath, options = {}) {
  const fs = require('fs');
  const path = require('path');

  if (!fs.existsSync(imagePath)) {
    throw new Error(`图片不存在: ${imagePath}`);
  }

  if (options.title) {
    try {
      const titleMd = `**📊 ${options.title}**`;
      const converted = await feishuJson(accessToken, '/docx/v1/documents/blocks/convert', {
        method: 'POST',
        body: JSON.stringify({ content_type: 'markdown', content: titleMd })
      });
      const descendants = (converted.blocks || []).map(block => {
        const copy = { ...block };
        delete copy.revision_id;
        delete copy.parent_id;
        if (!Array.isArray(copy.children)) copy.children = [];
        return copy;
      });
      const referenced = new Set();
      for (const block of descendants) {
        for (const childId of block.children || []) referenced.add(childId);
      }
      const childrenId = converted.first_level_block_ids?.length
        ? converted.first_level_block_ids
        : descendants.map(b => String(b.block_id || '')).filter(id => id && !referenced.has(id));

      if (descendants.length && childrenId.length) {
        await feishuJson(
          accessToken,
          `/docx/v1/documents/${documentId}/blocks/${documentId}/descendant?document_revision_id=-1`,
          {
            method: 'POST',
            body: JSON.stringify({ index: -1, children_id: childrenId, descendants })
          }
        );
      }
    } catch {
      // 标题插入失败不影响图片
    }
  }

  let created;
  try {
    created = await feishuJson(
      accessToken,
      `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
      {
        method: 'POST',
        body: JSON.stringify({
          index: -1,
          children: [{ block_type: 27, image: {} }]
        })
      }
    );
  } catch (err) {
    throw new Error(`创建图片块失败: ${err.message}`);
  }

  const imageBlockId = created.children?.[0]?.block_id;
  if (!imageBlockId) {
    throw new Error('创建飞书图片块失败（无 block_id）');
  }

  const result = await uploadImageToBlock(accessToken, documentId, imageBlockId, imagePath);
  return result;
}

async function getDocumentChildrenOrder(accessToken, documentId) {
  const page = await feishuJson(
    accessToken,
    `/docx/v1/documents/${documentId}/blocks/${documentId}`,
    { method: 'GET' }
  );
  const block = page.block || page;
  return block.children || [];
}

async function insertMarkdownBlocksAtIndex(accessToken, documentId, insertIndex, markdown) {
  const converted = await feishuJson(accessToken, '/docx/v1/documents/blocks/convert', {
    method: 'POST',
    body: JSON.stringify({ content_type: 'markdown', content: markdown })
  });
  const descendants = (converted.blocks || []).map(block => {
    const copy = { ...block };
    delete copy.revision_id;
    delete copy.parent_id;
    if (copy.block_type === 31 && copy.table?.property) {
      const property = { ...copy.table.property };
      delete property.merge_info;
      copy.table = { ...copy.table, property };
    }
    if (!Array.isArray(copy.children)) copy.children = [];
    return copy;
  });
  const referenced = new Set();
  for (const block of descendants) {
    for (const childId of block.children || []) referenced.add(childId);
  }
  const childrenId = converted.first_level_block_ids?.length
    ? converted.first_level_block_ids
    : descendants.map(b => String(b.block_id || '')).filter(id => id && !referenced.has(id));

  if (!descendants.length || !childrenId.length) return 0;

  await feishuJson(
    accessToken,
    `/docx/v1/documents/${documentId}/blocks/${documentId}/descendant?document_revision_id=-1`,
    {
      method: 'POST',
      body: JSON.stringify({ index: insertIndex, children_id: childrenId, descendants })
    }
  );
  return childrenId.length;
}

/**
 * 在指定块之后插入本地图片（QuickChart / AI 图表 PNG）
 */
async function insertLocalImageAfterBlock(accessToken, documentId, afterBlockId, imagePath, options = {}) {
  const fs = require('fs');
  const path = require('path');

  if (!fs.existsSync(imagePath)) {
    throw new Error(`图片不存在: ${imagePath}`);
  }

  const children = await getDocumentChildrenOrder(accessToken, documentId);
  let insertIndex = children.indexOf(afterBlockId);
  if (insertIndex < 0) {
    console.warn(`   锚点块未找到 (${afterBlockId})，改为追加到文档末尾`);
    return insertLocalImageIntoDocument(accessToken, documentId, imagePath, options);
  }
  insertIndex += 1;

  if (options.title) {
    const added = await insertMarkdownBlocksAtIndex(
      accessToken,
      documentId,
      insertIndex,
      `**📊 ${options.title}**`
    );
    insertIndex += added || 1;
  }

  const created = await feishuJson(
    accessToken,
    `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
    {
      method: 'POST',
      body: JSON.stringify({
        index: insertIndex,
        children: [{ block_type: 27, image: {} }]
      })
    }
  );

  const imageBlockId = created.children?.[0]?.block_id;
  if (!imageBlockId) {
    throw new Error('创建飞书图片块失败（无 block_id）');
  }

  const result = await uploadImageToBlock(accessToken, documentId, imageBlockId, imagePath);

  return { ...result, insertIndex, afterBlockId };
}

async function listDocumentTableBlocks(accessToken, documentId) {
  const children = await getDocumentChildrenOrder(accessToken, documentId);
  let pageToken = '';
  const blocks = {};

  do {
    const query = pageToken ? `?page_token=${pageToken}` : '';
    const res = await feishuJson(
      accessToken,
      `/docx/v1/documents/${documentId}/blocks${query}`,
      { method: 'GET' }
    );
    for (const block of res.items || []) {
      blocks[block.block_id] = block;
    }
    pageToken = res.has_more ? res.page_token : '';
  } while (pageToken);

  return children
    .filter(id => blocks[id]?.block_type === 31)
    .map((blockId, index) => ({ blockId, index, block: blocks[blockId] }));
}

/**
 * 将图表按 tableIndex 绑定到文档中的表格 block，并插入到表格后
 */
function attachChartsToTableBlocks(charts, tableBlocks) {
  return charts.map(chart => {
    const tableIndex = chart.tableIndex ?? 0;
    const target = tableBlocks[tableIndex];
    if (!target) {
      console.warn(`   ⚠ 表格索引 ${tableIndex} 不存在（${chart.title}），将追加到文档末尾`);
      return chart;
    }
    return { ...chart, afterBlockId: target.blockId };
  });
}

async function listAllDocumentBlocks(accessToken, documentId) {
  const blocks = {};
  let pageToken = '';
  do {
    const query = pageToken ? `?page_token=${pageToken}` : '';
    const res = await feishuJson(
      accessToken,
      `/docx/v1/documents/${documentId}/blocks${query}`,
      { method: 'GET' }
    );
    for (const block of res.items || []) {
      blocks[block.block_id] = block;
    }
    pageToken = res.has_more ? res.page_token : '';
  } while (pageToken);
  return blocks;
}

/**
 * 表头行：仅单元格浅蓝底（禁用 header_row 灰底，不用文字高亮）
 */
async function styleFeishuTableHeaders(accessToken, documentId, options = {}) {
  const cellBg = options.headerCellBackground || 'LightBlueBackground';
  const tableBlocks = await listDocumentTableBlocks(accessToken, documentId);
  const allBlocks = await listAllDocumentBlocks(accessToken, documentId);
  let styled = 0;

  for (const { blockId, block } of tableBlocks) {
    const table = block.table;
    if (!table?.cells?.length || !table.property?.column_size) continue;
    const colSize = table.property.column_size;
    const headerCellIds = table.cells.slice(0, colSize);

    // 关闭飞书默认标题行灰底（与浅蓝底叠色）
    try {
      await feishuJson(
        accessToken,
        `/docx/v1/documents/${documentId}/blocks/${blockId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            update_table_property: {
              header_row: false
            }
          })
        }
      );
    } catch {
      // 忽略
    }

    for (const cellId of headerCellIds) {
      const cellBlock = allBlocks[cellId];
      if (!cellBlock?.children?.length) continue;

      for (const childId of cellBlock.children) {
        const textBlock = allBlocks[childId];
        if (!textBlock || textBlock.block_type !== 2) continue;

        try {
          await feishuJson(
            accessToken,
            `/docx/v1/documents/${documentId}/blocks/${childId}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                update_text_style: {
                  style: { background_color: cellBg, align: 2 },
                  fields: [6, 1]
                }
              })
            }
          );
          styled++;
        } catch (err) {
          console.warn(`   ⚠ 表头单元格背景失败 (${childId}): ${err.message}`);
        }

        const elements = textBlock.text?.elements || [];
        if (!elements.length) continue;
        const updated = elements.map(el => {
          if (!el.text_run) return el;
          const prev = el.text_run.text_element_style || {};
          const { background_color, text_color, ...rest } = prev;
          return {
            text_run: {
              content: el.text_run.content || '',
              text_element_style: { ...rest, bold: true }
            }
          };
        });
        try {
          await feishuJson(
            accessToken,
            `/docx/v1/documents/${documentId}/blocks/${childId}`,
            {
              method: 'PATCH',
              body: JSON.stringify({ update_text_elements: { elements: updated } })
            }
          );
        } catch {
          // 加粗失败不阻断
        }
      }
    }
  }

  return styled;
}

/** 文档首个一级标题设为蓝色（FontColor=5） */
async function styleFeishuDocumentTitle(accessToken, documentId, options = {}) {
  const titleColor = options.titleColor ?? 5;
  const children = await getDocumentChildrenOrder(accessToken, documentId);
  const allBlocks = await listAllDocumentBlocks(accessToken, documentId);

  for (const blockId of children) {
    const block = allBlocks[blockId];
    if (!block) continue;
    if (block.block_type === 3) {
      const elements = block.heading1?.elements || block.text?.elements || [];
      if (!elements.length) continue;
      const updated = elements.map(el => {
        if (!el.text_run) return el;
        return {
          text_run: {
            content: el.text_run.content || '',
            text_element_style: {
              ...(el.text_run.text_element_style || {}),
              bold: true,
              text_color: titleColor
            }
          }
        };
      });
      await feishuJson(
        accessToken,
        `/docx/v1/documents/${documentId}/blocks/${blockId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ update_text_elements: { elements: updated } })
        }
      );
      return blockId;
    }
  }
  return null;
}

async function clearTableCellChildren(accessToken, documentId, cellBlock, allBlocks) {
  const childIds = cellBlock.children || [];
  for (const childId of [...childIds].reverse()) {
    const child = allBlocks[childId];
    if (!child) continue;
    try {
      await feishuJson(
        accessToken,
        `/docx/v1/documents/${documentId}/blocks/${childId}`,
        { method: 'DELETE' }
      );
    } catch {
      // 忽略删除失败
    }
  }
}

/**
 * 在表格指定列插入本地图片（跳过表头行）
 * @param {number} tableIndex - 文档中第 N 个表格（0-based）
 * @param {number} columnIndex - 列索引（0-based）
 * @param {string[]} imagePaths - 与数据行一一对应
 */
async function embedImagesInTableColumn(accessToken, documentId, tableIndex, columnIndex, imagePaths, options = {}) {
  const maxWidth = options.maxWidth || 72;
  const maxHeight = options.maxHeight || 72;
  const tableBlocks = await listDocumentTableBlocks(accessToken, documentId);
  const target = tableBlocks[tableIndex];
  if (!target) {
    console.warn(`   ⚠ 表格索引 ${tableIndex} 不存在，跳过图片嵌入`);
    return 0;
  }

  const table = target.block.table;
  const colSize = table.property.column_size;
  const rowSize = table.property.row_size;
  const allBlocks = await listAllDocumentBlocks(accessToken, documentId);
  let inserted = 0;

  for (let row = 1; row < rowSize && row - 1 < imagePaths.length; row++) {
    const imgPath = imagePaths[row - 1];
    if (!imgPath || !require('fs').existsSync(imgPath)) continue;

    const cellIndex = row * colSize + columnIndex;
    const cellId = table.cells[cellIndex];
    const cellBlock = allBlocks[cellId];
    if (!cellBlock) continue;

    await clearTableCellChildren(accessToken, documentId, cellBlock, allBlocks);

    const created = await feishuJson(
      accessToken,
      `/docx/v1/documents/${documentId}/blocks/${cellId}/children`,
      {
        method: 'POST',
        body: JSON.stringify({
          index: 0,
          children: [{ block_type: 27, image: {} }]
        })
      }
    );

    const imageBlockId = created.children?.[0]?.block_id;
    if (!imageBlockId) continue;

    await uploadImageToBlock(accessToken, documentId, imageBlockId, imgPath, {
      maxWidth,
      exactWidth: maxWidth,
      exactHeight: maxHeight
    });
    inserted++;
  }

  return inserted;
}

async function insertChartsIntoDocument(accessToken, documentId, charts) {
  const anchored = charts.filter(c => c.afterBlockId);
  const append = charts.filter(c => !c.afterBlockId);

  let inserted = [];

  if (anchored.length) {
    const children = await getDocumentChildrenOrder(accessToken, documentId);
    const sorted = [...anchored].sort(
      (a, b) => children.indexOf(b.afterBlockId) - children.indexOf(a.afterBlockId)
    );
    for (const chart of sorted) {
      const result = await insertLocalImageAfterBlock(
        accessToken,
        documentId,
        chart.afterBlockId,
        chart.path,
        { title: chart.title }
      );
      inserted.push({ ...chart, ...result });
    }
  }

  for (const chart of append) {
    const result = await insertLocalImageIntoDocument(accessToken, documentId, chart.path, {
      title: chart.title
    });
    inserted.push({ ...chart, ...result });
  }

  return inserted;
}

function parseFeishuUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('空的飞书链接或 document_id');

  if (/^[A-Za-z0-9]{15,}$/.test(raw) && !raw.includes('/')) {
    return { kind: 'docx', token: raw, source: raw };
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`无法解析飞书链接: ${raw}`);
  }

  const docxMatch = url.pathname.match(/\/docx\/([A-Za-z0-9]+)/);
  if (docxMatch) {
    return { kind: 'docx', token: docxMatch[1], source: raw };
  }

  const wikiMatch = url.pathname.match(/\/wiki\/([A-Za-z0-9]+)/);
  if (wikiMatch) {
    return { kind: 'wiki', token: wikiMatch[1], source: raw };
  }

  throw new Error(`不支持的飞书链接格式: ${raw}`);
}

async function resolveWikiNode(accessToken, wikiToken) {
  const data = await feishuJson(
    accessToken,
    `/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`,
    { method: 'GET' }
  );
  const node = data.node || data;
  if (!node?.obj_token) {
    throw new Error(`Wiki 节点解析失败: ${wikiToken}`);
  }
  if (node.obj_type !== 22 && node.obj_type !== 'docx') {
    throw new Error(`Wiki 节点不是 docx 文档（obj_type=${node.obj_type}）`);
  }
  return {
    documentId: node.obj_token,
    title: node.title || wikiToken,
    wikiToken
  };
}

async function getDocumentMeta(accessToken, documentId) {
  const data = await feishuJson(
    accessToken,
    `/docx/v1/documents/${documentId}`,
    { method: 'GET' }
  );
  return data.document || data;
}

async function getDocumentMarkdownContent(accessToken, documentId) {
  const params = new URLSearchParams({
    doc_token: documentId,
    doc_type: 'docx',
    content_type: 'markdown'
  });
  const data = await feishuJson(
    accessToken,
    `/docs/v1/content?${params.toString()}`,
    { method: 'GET' }
  );
  return data.content || '';
}

async function getDocumentRawContent(accessToken, documentId) {
  const data = await feishuJson(
    accessToken,
    `/docx/v1/documents/${documentId}/raw_content`,
    { method: 'GET' }
  );
  return data.content || '';
}

function slugifyTitle(title, fallback) {
  const base = String(title || fallback || 'feishu-doc')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return base || 'feishu-doc';
}

async function readFeishuDocument(accessToken, input, options = {}) {
  const parsed = parseFeishuUrl(input);
  let documentId = parsed.token;
  let title = documentId;
  let sourceUrl = parsed.source;

  if (parsed.kind === 'wiki') {
    const wiki = await resolveWikiNode(accessToken, parsed.token);
    documentId = wiki.documentId;
    title = wiki.title || documentId;
  } else {
    try {
      const meta = await getDocumentMeta(accessToken, documentId);
      title = meta.title || title;
    } catch {
      // 元数据失败不阻断正文读取
    }
  }

  let markdown = '';
  let format = 'markdown-api';
  try {
    markdown = await getDocumentMarkdownContent(accessToken, documentId);
  } catch (err) {
    console.warn(`   Markdown API 不可用 (${err.message})，回退 raw_content…`);
    markdown = await getDocumentRawContent(accessToken, documentId);
    format = 'raw_content';
  }

  if (!markdown.trim()) {
    throw new Error('文档内容为空或无权读取');
  }

  const header = [
    `Source URL: ${sourceUrl}`,
    `Document ID: ${documentId}`,
    `Title: ${title}`,
    `Fetched: ${new Date().toISOString().slice(0, 10)}`,
    `Format: ${format}`,
    '',
    '---',
    ''
  ].join('\n');

  return {
    documentId,
    title,
    sourceUrl,
    format,
    markdown: header + markdown
  };
}

module.exports = {
  ROOT,
  USER_AUTH_FILE,
  loadEnv,
  getFeishuAppId,
  getFeishuAppSecret,
  isFeishuConfigured,
  getRedirectUri,
  readUserAuth,
  writeUserAuth,
  deleteUserAuth,
  getUserAuthStatus,
  getValidUserAccessToken,
  getTenantAccessToken,
  ensureUserAuth,
  runOAuthFlow,
  feishuJson,
  buildAuthorizeUrl,
  ensureDocumentEditable,
  readPngDimensions,
  readImageDimensions,
  fitImageDimensions,
  getDocumentChildrenOrder,
  listDocumentTableBlocks,
  listAllDocumentBlocks,
  styleFeishuTableHeaders,
  styleFeishuDocumentTitle,
  embedImagesInTableColumn,
  attachChartsToTableBlocks,
  insertMarkdownBlocksAtIndex,
  insertLocalImageIntoDocument,
  insertLocalImageAfterBlock,
  replaceImageInBlock,
  insertChartsIntoDocument,
  parseFeishuUrl,
  resolveWikiNode,
  getDocumentMeta,
  readFeishuDocument,
  slugifyTitle
};

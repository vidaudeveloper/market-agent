const fs = require('fs');
const path = require('path');
const { getRoot } = require('./root');

function getChuhaijiangStatus(root) {
  try {
    const { getLoginStatus } = require(path.join(root, 'scripts', 'chuhaijiang-auth-check.js'));
    const status = getLoginStatus();
    return {
      connected: status.ok,
      method: status.session?.source,
      has_auth_session: status.has_auth_session,
      storage_expired: status.storage_expired || false,
      recommended_action: status.recommended_action
    };
  } catch {
    const storage = path.join(root, 'auth', 'chuhaijiang-storage.json');
    if (fs.existsSync(storage)) {
      return { connected: true, method: 'storage' };
    }
    return { connected: false };
  }
}

function getFeishuStatus(root) {
  try {
    const { getUserAuthStatus } = require(path.join(root, 'scripts', 'feishu-lib.js'));
    const status = getUserAuthStatus();
    return {
      connected: !!status.connected,
      user: status.name || undefined,
      expires_at: status.expires_at || undefined,
      updated_at: status.updated_at || undefined
    };
  } catch {
    return { connected: false };
  }
}

function getEnvStatus(root) {
  const envPath = path.join(root, '.env');
  const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  const hasId = /FEISHU_APP_ID\s*=\s*\S+/.test(envText);
  const hasSecret = /FEISHU_APP_SECRET\s*=\s*\S+/.test(envText);
  const playwrightDir = path.join(root, 'node_modules', 'playwright');

  return {
    feishu_app_configured: hasId && hasSecret,
    node_ok: true,
    playwright_ok: fs.existsSync(playwrightDir)
  };
}

function getAuthStatus() {
  const root = getRoot();
  const feishu = getFeishuStatus(root);
  const chuhaijiang = getChuhaijiangStatus(root);
  const env = getEnvStatus(root);

  const missing = [];
  if (!env.feishu_app_configured) missing.push('feishu_env');
  if (!feishu.connected) missing.push('feishu_oauth');
  if (!chuhaijiang.connected) missing.push('chuhaijiang_login');
  if (!env.playwright_ok) missing.push('playwright_install');

  return {
    root,
    feishu,
    chuhaijiang,
    env,
    ready_for_pipeline: chuhaijiang.connected && env.playwright_ok,
    ready_for_feishu_export: env.feishu_app_configured,
    feishu_needs_oauth: !feishu.connected && env.feishu_app_configured,
    missing_steps: missing
  };
}

module.exports = { getAuthStatus, getChuhaijiangStatus, getFeishuStatus, getEnvStatus };

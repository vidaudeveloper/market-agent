const { spawn } = require('child_process');
const path = require('path');
const { getRoot } = require('./root');

function runNodeScript(scriptRel, args = [], options = {}) {
  const root = getRoot();
  const scriptPath = path.join(root, scriptRel);
  const {
    timeout = 120000,
    env = {},
    cwd = root
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      cwd,
      env: { ...process.env, ...env, VIDAU_MARKET_ROOT: root },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer =
      timeout > 0
        ? setTimeout(() => {
            killed = true;
            child.kill('SIGTERM');
          }, timeout)
        : null;

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('error', err => {
      if (timer) clearTimeout(timer);
      reject(err);
    });

    child.on('close', code => {
      if (timer) clearTimeout(timer);
      if (killed) {
        reject(new Error(`脚本超时（${timeout}ms）: ${scriptRel}`));
        return;
      }
      resolve({ code, stdout, stderr, scriptPath });
    });
  });
}

function extractFeishuUrl(text) {
  const match = text.match(/https:\/\/[^\s]*feishu\.cn\/[^\s]+/i);
  return match ? match[0].replace(/[)\],.]+$/, '') : null;
}

function extractReportPath(text, root) {
  const mdMatch = text.match(/output[/\\][^\s"'`]+\.md/);
  if (mdMatch) return path.join(root, mdMatch[0].replace(/\\/g, '/'));
  return null;
}

module.exports = { runNodeScript, extractFeishuUrl, extractReportPath };

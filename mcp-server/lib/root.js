const fs = require('fs');
const path = require('path');

function getRoot() {
  if (process.env.VIDAU_MARKET_ROOT) {
    const root = path.resolve(process.env.VIDAU_MARKET_ROOT);
    if (!fs.existsSync(root)) {
      throw new Error(`VIDAU_MARKET_ROOT 不存在: ${root}`);
    }
    return root;
  }
  return path.resolve(__dirname, '..', '..');
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

module.exports = { getRoot, toPosix };

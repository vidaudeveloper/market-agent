#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MCP_INDEX="$ROOT/mcp-server/index.js"
CURSOR_MCP="$ROOT/.cursor/mcp.json"

if [[ ! -f "$MCP_INDEX" ]]; then
  echo "[错误] 未找到 mcp-server/index.js"
  exit 1
fi

node -e "
const { mergeMcpJson } = require('./scripts/merge-mcp-json');
mergeMcpJson(process.argv[1], 'vidau-market', {
  command: 'node',
  args: [process.argv[2]],
  env: { VIDAU_MARKET_ROOT: process.argv[3] }
});
console.log('[OK] 已合并 vidau-market →', process.argv[1]);
" "$CURSOR_MCP" "$MCP_INDEX" "$ROOT"

echo ""
echo "Hermes:"
echo "  hermes mcp add vidau-market --command node --args $MCP_INDEX --env VIDAU_MARKET_ROOT=$ROOT"
echo "  /reload-mcp"

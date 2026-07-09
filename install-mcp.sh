#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MCP_INDEX="$ROOT/mcp-server/index.js"
CURSOR_MCP="$ROOT/.cursor/mcp.json"

if [[ ! -f "$MCP_INDEX" ]]; then
  echo "[错误] 未找到 mcp-server/index.js"
  exit 1
fi

mkdir -p "$ROOT/.cursor"

cat > "$CURSOR_MCP" <<EOF
{
  "mcpServers": {
    "vidau-market": {
      "command": "node",
      "args": ["$MCP_INDEX"],
      "env": {
        "VIDAU_MARKET_ROOT": "$ROOT"
      }
    }
  }
}
EOF

echo "[OK] 已写入 Cursor 项目配置: $CURSOR_MCP"
echo ""
echo "Hermes:"
echo "  hermes mcp add vidau-market --command node --args $MCP_INDEX --env VIDAU_MARKET_ROOT=$ROOT"
echo "  /reload-mcp"

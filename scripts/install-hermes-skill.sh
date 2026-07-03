#!/usr/bin/env bash
# Install /vidau-market-agent slash skill for Hermes
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_SRC="$ROOT/skills/vidau-market-agent"
DEST_DIR="${HOME}/.hermes/skills/vidau-market-agent"

if [ ! -f "$SKILL_SRC/SKILL.md" ]; then
  echo "[错误] 未找到 $SKILL_SRC/SKILL.md，请在 market-agent 仓库根目录运行"
  exit 1
fi

mkdir -p "${HOME}/.hermes/skills"
rm -rf "$DEST_DIR"
cp -r "$SKILL_SRC" "$DEST_DIR"

echo ""
echo "========================================"
echo "  已安装 Hermes 斜杠技能: /vidau-market-agent"
echo "========================================"
echo "  目标: $DEST_DIR"
echo ""
echo "下一步:"
echo "  1. 在 Hermes 中将 workspace 设为: $ROOT"
echo "  2. 聊天输入 /reload-skills 或重启 Hermes"
echo "  3. 输入 /vidau-market-agent 开始使用"
echo ""
echo "详见 HERMES.md"

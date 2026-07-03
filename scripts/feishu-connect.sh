#!/usr/bin/env bash
# 普通用户：一键连接飞书（首次 OAuth）
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "========================================"
echo "  Vidau Market Agent - 连接飞书"
echo "========================================"
echo ""
echo "说明:"
echo "  - 不要用 Hermes 里的「agent飞书认证」按钮"
echo "  - 本脚本会把报告导出到【你自己的】飞书账号"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 未检测到 Node.js，请先运行 bash setup.sh 或安装 Node 18+"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[提示] 首次使用，正在安装依赖..."
  npm install
fi

echo "[1/2] 正在打开浏览器，请在飞书页面点击「同意授权」..."
echo ""
if ! node scripts/feishu-auth.js; then
  echo ""
  echo "========================================"
  echo "  授权未成功"
  echo "========================================"
  echo ""
  echo "若页面显示「没有 access to agent飞书认证」:"
  echo "  1. 确认没有用 Hermes 内置飞书，只用本脚本"
  echo "  2. 联系飞书管理员把你加入应用「可用范围」"
  echo "  3. 详见 FEISHU-USER-GUIDE.md"
  exit 1
fi

echo ""
echo "[2/2] 检查连接状态..."
node scripts/feishu-auth.js --status
echo ""
echo "========================================"
echo "  完成！现在可以导出飞书了"
echo "========================================"
echo ""
echo "在 Agent 里说:"
echo "  「把 output 里的报告导出到我的飞书」"
echo ""
echo "或自己运行:"
echo "  node scripts/feishu-export.js output/报告.md \"标题\" --charts"
echo ""
echo "详细说明: FEISHU-USER-GUIDE.md"

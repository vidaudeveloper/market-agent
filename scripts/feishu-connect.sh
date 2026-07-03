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
echo "  - 请先在 .env 配置你自己的飞书应用（见 FEISHU-APP-SETUP.md）"
echo "  - 不要用 Hermes 内置飞书插件"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 未检测到 Node.js，请先运行 bash setup.sh 或安装 Node 18+"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[提示] 首次使用，正在安装依赖..."
  npm install
fi

echo "[0/3] 运行诊断..."
node scripts/feishu-diagnose.js
echo ""
echo "请确认上面「应用 ID」与浏览器授权页 client_id 一致。"
read -r -p "按回车继续打开浏览器授权..."

echo ""
echo "[1/3] 正在打开浏览器，请在飞书页面点击「同意授权」..."
echo ""
if ! node scripts/feishu-auth.js; then
  echo ""
  echo "========================================"
  echo "  授权未成功"
  echo "========================================"
  echo ""
  echo "常见原因:"
  echo "  1. .env 未填飞书凭证 → FEISHU-APP-SETUP.md"
  echo "  2. 应用未发布或可用范围不含你"
  echo "  3. 误用 Hermes 内置飞书"
  exit 1
fi

echo ""
echo "[2/3] 检查连接状态..."
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
echo "详细说明: FEISHU-USER-GUIDE.md / FEISHU-APP-SETUP.md"

#!/usr/bin/env bash
set -e

echo "========================================"
echo "  AI营销全案策划师 - 一键安装"
echo "========================================"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 请先安装 Node.js 18+: https://nodejs.org"
  exit 1
fi

echo "[1/3] 安装 Node.js 依赖..."
npm install

echo "[2/3] 安装 Playwright 浏览器..."
npx playwright install chromium || echo "[警告] Playwright 安装失败"

echo "[3/3] 检查配置文件..."
[ ! -f .env ] && cp .env.example .env && echo "[提示] 已复制 .env.example → .env"
echo "[重要] 导出飞书前请在 .env 填入你自己的飞书应用（见 FEISHU-APP-SETUP.md）"

echo
echo "========================================"
echo "  安装完成！"
echo "========================================"
echo
echo "下一步:"
echo "  1. Hermes/Cursor 打开本目录写报告（无需 AI_API_KEY）"
echo "  2. 飞书: 按 FEISHU-APP-SETUP.md 创建应用并填入 .env"
echo "  3. bash scripts/feishu-connect.sh 连接飞书"
echo "  4. node scripts/feishu-export.js output/报告.md \"标题\" --charts"
echo "  飞书: FEISHU-APP-SETUP.md | FEISHU-USER-GUIDE.md"
echo

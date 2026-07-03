@echo off
echo ========================================
echo   AI营销全案策划师 - 一键安装
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 请先安装 Node.js 18+: https://nodejs.org
    pause
    exit /b 1
)

echo [1/3] 安装 Node.js 依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] npm install 失败，请检查网络
    pause
    exit /b 1
)

echo [2/3] 安装 Playwright 浏览器...
call npx playwright install chromium
if %errorlevel% neq 0 (
    echo [警告] Playwright 浏览器安装失败，出海匠数据抓取可能不可用
)

echo [3/3] 检查配置文件...
if not exist ".env" (
    copy .env.example .env >nul
    echo [提示] 已从 .env.example 复制 .env；若已 git clone 且仓库含 .env 可忽略
)
if not exist "auth.json" (
    echo [提示] 如需出海匠数据，可复制 auth.example.json 为 auth.json
)

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 项目路径: %~dp0
echo.
echo 下一步:
echo   1. 用 Hermes/Cursor 打开本文件夹，直接对话写报告（无需 AI_API_KEY）
echo   2. 连接飞书: 双击 feishu-connect.bat（首次每人做一次，勿用 Hermes 内置飞书）
echo   3. 导出飞书: node scripts/feishu-export.js output/报告.md "标题" --charts
echo   4. (可选) 仅 ai-analyze.js 或 --charts-ai 需在 .env 填 AI_API_KEY
echo   5. (可选) 出海匠数据: 配置 auth.json
echo.
echo 飞书用户指南: FEISHU-USER-GUIDE.md
echo.
pause

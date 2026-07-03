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
    echo [提示] 已从 .env.example 复制 .env，请填入 AI API Key
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
echo   1. 编辑 .env，填入 AI API Key
echo   2. (可选) 配置 FEISHU_APP_ID 使用飞书导出
echo   3. 在 Cursor 中 Open Folder 打开本目录
echo.
echo 飞书导出:
echo   node scripts/feishu-export.js output/报告.md "文档标题"
echo   详见 README.md
echo.
pause

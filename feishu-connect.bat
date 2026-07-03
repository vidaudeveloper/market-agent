@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo ========================================
echo   Vidau Market Agent - 连接飞书
echo ========================================
echo.
echo 说明:
echo   - 不要用 Hermes 里的「agent飞书认证」按钮
echo   - 本脚本会把报告导出到【你自己的】飞书账号
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先双击 setup.bat 或安装 Node 18+
    echo        https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [提示] 首次使用，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] npm install 失败
        pause
        exit /b 1
    )
)

echo [1/2] 正在打开浏览器，请在飞书页面点击「同意授权」...
echo.
node scripts/feishu-auth.js
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   授权未成功
    echo ========================================
    echo.
    echo 若页面显示「没有 access to agent飞书认证」:
    echo   1. 确认没有用 Hermes 内置飞书，只用本脚本
    echo   2. 联系飞书管理员把你加入应用「可用范围」
    echo   3. 详见 FEISHU-USER-GUIDE.md
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] 检查连接状态...
node scripts/feishu-auth.js --status
echo.
echo ========================================
echo   完成！现在可以导出飞书了
echo ========================================
echo.
echo 在 Agent 里说:
echo   「把 output 里的报告导出到我的飞书」
echo.
echo 或自己运行:
echo   node scripts/feishu-export.js output/报告.md "标题" --charts
echo.
echo 详细说明: FEISHU-USER-GUIDE.md
echo.
pause

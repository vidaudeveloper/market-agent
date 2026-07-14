@echo off
chcp 65001 >nul
setlocal
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo ========================================
echo   Vidau Market Agent 一键安装
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 请先安装 Node.js 18+: https://nodejs.org
  pause
  exit /b 1
)

echo [1/6] 安装 Node 依赖 + Playwright...
call "%ROOT%\setup.bat"
if errorlevel 1 exit /b 1

echo.
echo [2/6] 安装 Hermes 斜杠技能 /vidau-market-agent ...
call "%ROOT%\install-hermes-skill.bat"

echo.
echo [3/6] 配置 vidau-market MCP（本仓库脚本能力）...
call "%ROOT%\install-mcp.bat"

echo.
echo [4/6] SkillHub 安装出海匠官方 skill...
node "%ROOT%\scripts\install-chuhaijiang-skillhub.js"
if errorlevel 1 (
  echo [警告] 出海匠 skill 安装失败，可稍后手动: node scripts/install-chuhaijiang-skillhub.js
)

echo.
echo [5/6] 配置出海匠开放平台 MCP（HTTP）...
node "%ROOT%\scripts\install-chuhaijiang-open-mcp.js"
if errorlevel 1 (
  echo [警告] 出海匠 MCP 配置失败
)

echo.
echo [6/6] 检查飞书环境...
if not exist "%ROOT%\.env" (
  copy "%ROOT%\.env.example" "%ROOT%\.env" >nul
  echo [提示] 已创建 .env — 请向管理员索取飞书 FEISHU_APP_ID / SECRET
)
node "%ROOT%\scripts\feishu-diagnose.js" 2>nul

echo.
echo ========================================
echo   基础安装完成
echo ========================================
echo.
echo 你还需要（Agent 可引导你完成）:
echo   1. 向管理员索取飞书凭证写入 .env
echo   2. feishu-connect.bat 完成飞书 OAuth
echo   3. 出海匠 API Key: developer.chuhaijiang.com 创建 sk_live_
echo      然后: node scripts/install-chuhaijiang-open-mcp.js --api-key sk_live_xxx
echo   4. Hermes: /reload-skills 和 /reload-mcp
echo   5. 验证: 让 Agent 调用 account_info 和 auth_status
echo.
echo 详见: 同事安装指南.md
echo.
pause

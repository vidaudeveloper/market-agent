@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM Vidau Market MCP — 合并写入 Cursor 项目配置（不覆盖已有 chuhaijiang 等）
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "MCP_INDEX=%ROOT%\mcp-server\index.js"
set "CURSOR_DIR=%ROOT%\.cursor"
set "CURSOR_MCP=%CURSOR_DIR%\mcp.json"

if not exist "%MCP_INDEX%" (
  echo [错误] 未找到 mcp-server\index.js，请在仓库根目录运行本脚本。
  exit /b 1
)

set "ROOT_FWD=%ROOT:\=/%"
set "MCP_FWD=%MCP_INDEX:\=/%"

node -e "const {mergeMcpJson}=require('./scripts/merge-mcp-json'); mergeMcpJson('%CURSOR_MCP:\=\\%', 'vidau-market', { command: 'node', args: ['%MCP_FWD%'], env: { VIDAU_MARKET_ROOT: '%ROOT_FWD%' } }); console.log('OK');"

if errorlevel 1 (
  echo [错误] 写入 MCP 配置失败
  exit /b 1
)

echo.
echo [OK] 已合并 vidau-market 到 Cursor 配置:
echo   %CURSOR_MCP%
echo.
echo Hermes 用户请执行:
echo   hermes mcp add vidau-market --command node --args "%MCP_FWD%" --env VIDAU_MARKET_ROOT=%ROOT_FWD%
echo   然后在聊天输入 /reload-mcp
echo.
pause

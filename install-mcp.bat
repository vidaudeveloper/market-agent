@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM Vidau Market MCP — 写入 Cursor 项目级配置
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "MCP_INDEX=%ROOT%\mcp-server\index.js"
set "CURSOR_DIR=%ROOT%\.cursor"
set "CURSOR_MCP=%CURSOR_DIR%\mcp.json"

if not exist "%MCP_INDEX%" (
  echo [错误] 未找到 mcp-server\index.js，请在仓库根目录运行本脚本。
  exit /b 1
)

if not exist "%CURSOR_DIR%" mkdir "%CURSOR_DIR%"

REM 将反斜杠转为正斜杠（JSON 兼容）
set "ROOT_FWD=%ROOT:\=/%"
set "MCP_FWD=%MCP_INDEX:\=/%"

> "%CURSOR_MCP%" (
  echo {
  echo   "mcpServers": {
  echo     "vidau-market": {
  echo       "command": "node",
  echo       "args": ["%MCP_FWD%"],
  echo       "env": {
  echo         "VIDAU_MARKET_ROOT": "%ROOT_FWD%"
  echo       }
  echo     }
  echo   }
  echo }
)

echo.
echo [OK] 已写入 Cursor 项目配置:
echo   %CURSOR_MCP%
echo.
echo 下一步:
echo   1. 在 Cursor 中打开本仓库文件夹
echo   2. Settings - MCP 确认 vidau-market 已启用（或重启 Cursor）
echo   3. 对话测试: 先调用 auth_status，再查 beauty 竞品
echo.
echo Hermes 用户请执行:
echo   hermes mcp add vidau-market --command node --args "%MCP_FWD%" --env VIDAU_MARKET_ROOT=%ROOT_FWD%
echo   然后在聊天输入 /reload-mcp
echo.
pause

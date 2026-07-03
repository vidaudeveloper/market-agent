@echo off
setlocal
set "ROOT=%~dp0.."
set "SKILL_SRC=%ROOT%skills\vidau-market-agent"
set "DEST_DIR=%USERPROFILE%\.hermes\skills\vidau-market-agent"

if not exist "%SKILL_SRC%\SKILL.md" (
  echo [错误] 未找到 skills\vidau-market-agent\SKILL.md
  echo 请在 market-agent 仓库根目录运行 install-hermes-skill.bat
  pause
  exit /b 1
)

if not exist "%USERPROFILE%\.hermes\skills" mkdir "%USERPROFILE%\.hermes\skills"
if exist "%DEST_DIR%" rmdir /s /q "%DEST_DIR%"
xcopy /e /i /q "%SKILL_SRC%" "%DEST_DIR%" >nul

echo.
echo ========================================
echo   已安装 Hermes 斜杠技能: /vidau-market-agent
echo ========================================
echo   目标: %DEST_DIR%
echo.
echo 下一步:
echo   1. 在 Hermes 中将 workspace 设为本仓库根目录
echo      %ROOT%
echo   2. 聊天输入 /reload-skills 或重启 Hermes
echo   3. 输入 /vidau-market-agent 开始使用
echo.
echo 详见 HERMES.md
echo.
pause

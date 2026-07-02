@echo off
chcp 65001 >nul
cd /d "%~dp0"
title KG Companion

if not exist node_modules (
  echo Первый запуск: устанавливаю зависимости, это займёт пару минут...
  call npm install
)

echo.
echo ==========================================
echo   KG Companion запускается...
echo   Адрес: http://localhost:3000
echo   Закрыть: Ctrl+C или закрой это окно
echo ==========================================
echo.

rem открыть браузер через 4 сек (когда сервер поднимется)
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"

call npm run dev
pause

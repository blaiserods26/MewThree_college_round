@echo off
setlocal
title Stop PATCHWORK Services

echo ===============================================================================
echo   PATCHWORK -- Terminating Platform Services
echo   Stopping services on Ports 4000, 3000, and 5173
echo ===============================================================================
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":4000\>.*LISTENING :3000\>.*LISTENING :5173\>.*LISTENING"') do (
    echo [*] Stopping process PID %%a
    taskkill /f /pid %%a >nul 2>nul
)

echo.
echo [DONE] All PATCHWORK background services have been stopped.
echo.
pause

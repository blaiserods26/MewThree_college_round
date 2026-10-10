@echo off
setlocal enabledelayedexpansion
title Stop PATCHWORK Services

echo ===============================================================================
echo   PATCHWORK -- Terminating Platform Services
echo   Stopping services on Ports 4000, 3000, and 5173...
echo ===============================================================================
echo.

for %%P in (4000 3000 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":%%P\>.*LISTENING"') do (
        echo [*] Stopping process listening on port %%P (PID %%a)...
        taskkill /f /pid %%a >nul 2>nul
    )
)

echo.
echo [DONE] All PATCHWORK background services have been stopped.
echo.
pause

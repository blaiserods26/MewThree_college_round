@echo off
setlocal enabledelayedexpansion
title Stop PATCHWORK Services

echo ===============================================================================
echo   PATCHWORK -- Terminating Platform Services
echo   Stopping targeted services on Ports 4000, 3000, and 5173
echo ===============================================================================
echo.

set "STOPPED_COUNT=0"

for %%P in (4000 3000 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%P ^| findstr LISTENING') do (
        echo [*] Stopping service on Port %%P [PID %%a]...
        taskkill /f /pid %%a >nul 2>nul
        set /a STOPPED_COUNT+=1
    )
)

echo.
if !STOPPED_COUNT! gtr 0 (
    echo [DONE] Stopped !STOPPED_COUNT! PATCHWORK background service processes.
) else (
    echo [*] No active listening processes found on ports 4000, 3000, or 5173.
)
echo.
pause

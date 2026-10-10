@echo off
setlocal enabledelayedexpansion
title PATCHWORK Platform Launcher

echo ===============================================================================
echo   PATCHWORK -- Visual Hotfix Workbench ^& Release Governance Platform
echo   System Launcher
echo ===============================================================================
echo.

cd /d "%~dp0"

:: 1. Verify Node.js and npm
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js was not found in your PATH.
    echo Please install Node.js v20+ from https://nodejs.org and try again.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm was not found in your PATH.
    pause
    exit /b 1
)

:: 2. Ensure .env exists
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        echo [*] .env file not found. Creating .env from .env.example...
        copy "%~dp0.env.example" "%~dp0.env" >nul
        echo [*] Created .env with default local demo configuration.
    )
) else (
    echo [*] Configuration loaded from .env
)

:: 3. Verify dependencies
if not exist "%~dp0node_modules" (
    echo [*] Installing workspace dependencies (npm install)...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: 4. Verify build artifacts
if not exist "%~dp0packages\server\dist" (
    set "NEED_BUILD=1"
)
if not exist "%~dp0packages\dashboard\dist" (
    set "NEED_BUILD=1"
)
if not exist "%~dp0packages\runtime\dist" (
    set "NEED_BUILD=1"
)

if defined NEED_BUILD (
    echo [*] Build artifacts missing. Compiling monorepo workspaces (npm run build)...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Workspace build failed.
        pause
        exit /b 1
    )
    echo [*] Build completed successfully.
) else (
    echo [*] Verified compiled build artifacts.
)

:: 5. Clean up any existing instances on ports 4000, 3000, 5173 to avoid duplicate collision
for %%P in (4000 3000 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":%%P *LISTENING"') do (
        echo [*] Clearing existing listener on Port %%P (PID %%a)...
        taskkill /f /pid %%a >nul 2>nul
    )
)

:: 6. Seed demo database baseline
echo [*] Resetting demo database to clean baseline...
call npm run demo:reset

:: 7. Launch the services in dedicated console windows
echo.
echo [*] Launching API Server on Port 4000...
start "PATCHWORK API Server [Port 4000]" cmd /k "title PATCHWORK API Server [Port 4000] && cd /d "%~dp0" && npm run start --workspace=packages/server"

echo [*] Launching Host Storefront on Port 3000...
start "PATCHWORK Storefront [Port 3000]" cmd /k "title PATCHWORK Storefront [Port 3000] && cd /d "%~dp0" && npm run start --workspace=packages/storefront"

echo [*] Launching React Workbench Dashboard on Port 5173...
start "PATCHWORK Dashboard [Port 5173]" cmd /k "title PATCHWORK Dashboard [Port 5173] && cd /d "%~dp0" && npm run start --workspace=packages/dashboard"

:: 8. Active readiness polling
echo.
echo [*] Waiting for services to become ready...

set "API_READY=0"
set "STORE_READY=0"
set "DASH_READY=0"

for /l %%i in (1,1,15) do (
    if !API_READY! equ 0 (
        for /f %%c in ('curl.exe -s -o NUL -w "%%{http_code}" http://localhost:4000/api/health 2^>nul') do (
            if "%%c"=="200" set "API_READY=1"
        )
    )
    if !STORE_READY! equ 0 (
        for /f %%c in ('curl.exe -s -o NUL -w "%%{http_code}" http://localhost:3000 2^>nul') do (
            if "%%c"=="200" set "STORE_READY=1"
        )
    )
    if !DASH_READY! equ 0 (
        for /f %%c in ('curl.exe -s -o NUL -w "%%{http_code}" http://localhost:5173 2^>nul') do (
            if "%%c"=="200" set "DASH_READY=1"
        )
    )

    if !API_READY! equ 1 if !STORE_READY! equ 1 if !DASH_READY! equ 1 goto :ALL_READY
    ping 127.0.0.1 -n 2 >nul
)

:ALL_READY
echo.
if !API_READY! equ 0 echo [WARNING] API Server (port 4000) did not report ready within timeout.
if !STORE_READY! equ 0 echo [WARNING] Storefront (port 3000) did not report ready within timeout.
if !DASH_READY! equ 0 echo [WARNING] Dashboard (port 5173) did not report ready within timeout.

if !API_READY! equ 1 if !STORE_READY! equ 1 if !DASH_READY! equ 1 (
    echo [*] All services verified online and responding!
    echo [*] Opening Visual Hotfix Workbench in browser...
    start http://localhost:5173
)

echo.
echo ===============================================================================
echo   PATCHWORK PLATFORM IS NOW ONLINE!
echo ===============================================================================
echo   [1] Operator Dashboard:  http://localhost:5173
echo   [2] Host Storefront:     http://localhost:3000
echo   [3] Core API Engine:     http://localhost:4000/api
echo   [4] Health Check:        http://localhost:4000/api/health
echo ===============================================================================
echo   Services are running in separate dedicated terminal windows.
echo   To shut down all services cleanly, run: stop_all.bat
echo ===============================================================================
echo.
pause
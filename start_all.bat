@echo off
setlocal enabledelayedexpansion
title PATCHWORK Platform Launcher (Enterprise)

echo ===============================================================================
echo   PATCHWORK -- DOM Hotfix Engine ^& Governance Platform
echo   Enterprise Edition System Launcher
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
    echo [*] .env file not found. Creating .env from .env.example...
    copy "%~dp0.env.example" "%~dp0.env" >nul
    echo [*] Created .env with default local demo configuration.
) else (
    echo [*] Loaded configuration from .env
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
    
    echo [*] Installing Playwright Browsers...
    call npx playwright install chromium
)

:: 4. Verify build artifacts
if not exist "%~dp0packages\server\dist" (
    echo [*] Compiling TypeScript workspaces (npm run build)...
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Workspace compilation failed.
        pause
        exit /b 1
    )
    echo [*] Compiled build artifacts verified.
)

:: 5. Seed demo database baseline
echo [*] Seeding demo database to clean baseline...
call npm run demo:reset

:: 6. Launch the services in dedicated console windows
echo.
echo [*] Launching Real-Time API Server (Node/Fastify/WebSockets) on Port 4000...
start "PATCHWORK API Server [Port 4000]" cmd /k "title PATCHWORK API Server [Port 4000] && cd /d "%~dp0" && npm run start --workspace=packages/server"

echo [*] Launching Host Storefront (Demo Site) on Port 3000...
start "PATCHWORK Storefront [Port 3000]" cmd /k "title PATCHWORK Storefront [Port 3000] && cd /d "%~dp0" && npm run start --workspace=packages/storefront"

echo [*] Launching Operator Dashboard (Vite/React) on Port 5173...
start "PATCHWORK Dashboard [Port 5173]" cmd /k "title PATCHWORK Dashboard [Port 5173] && cd /d "%~dp0" && npm run start --workspace=packages/dashboard"

:: 7. Wait briefly for sockets and open browser
echo.
echo [*] Waiting 3 seconds for HTTP listeners to initialize...
ping 127.0.0.1 -n 4 >nul

echo [*] Opening Operator Dashboard in default browser...
start http://localhost:5173

echo.
echo ===============================================================================
echo   PATCHWORK PLATFORM IS NOW ONLINE!
echo ===============================================================================
echo   [1] Operator Dashboard:  http://localhost:5173
echo   [2] Host Storefront:     http://localhost:3000
echo   [3] Core API Engine:     http://localhost:4000/api
echo   [4] Health Check:        http://localhost:4000/api/health
echo ===============================================================================
echo   Individual service consoles have been launched in separate windows.
echo   To shut down all services, run: stop_all.bat (or close the windows).
echo ===============================================================================
echo.
pause
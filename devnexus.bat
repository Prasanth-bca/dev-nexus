@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

:menu
cls
echo ============================================
echo   Dev Nexus - Control Panel
echo ============================================
echo.

rem --- Check current status: is anything listening on port 3000? ---
set RUNNING=0
set SERVERPID=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set RUNNING=1
    set SERVERPID=%%p
)

if !RUNNING!==1 (
    echo   Dev Nexus : RUNNING   (pid !SERVERPID!, http://localhost:3000)
) else (
    echo   Dev Nexus : STOPPED
)

sc query MongoDB | findstr /i "RUNNING" >nul 2>&1
if !errorlevel!==0 (
    echo   MongoDB   : Running
) else (
    echo   MongoDB   : Stopped
)

echo.
echo ============================================
echo   1. Start Dev Nexus
echo   2. Stop Dev Nexus
echo   3. Refresh status
echo   4. Exit
echo ============================================
echo.
set "CHOICE="
set /p CHOICE="Choose an option (1-4): "

if "!CHOICE!"=="1" goto start
if "!CHOICE!"=="2" goto stop
if "!CHOICE!"=="3" goto menu
if "!CHOICE!"=="4" goto end
echo.
echo Not a valid option - pick 1, 2, 3, or 4.
pause
goto menu

:start
if !RUNNING!==1 (
    echo.
    echo Already running at http://localhost:3000 - nothing to do.
    pause
    goto menu
)

echo.
sc query MongoDB | findstr /i "RUNNING" >nul 2>&1
if !errorlevel!==0 (
    echo [MongoDB] Already running.
) else (
    echo [MongoDB] Starting service...
    net start MongoDB >nul 2>&1
    if !errorlevel!==0 (
        echo [MongoDB] Started.
    ) else (
        echo [MongoDB] Could not start it automatically - this usually needs Administrator rights.
        echo            Right-click this file and choose "Run as administrator", or start it
        echo            yourself with:  net start MongoDB
    )
)

echo.
echo [Dev Nexus] Starting the dev server in a new window...
rem "start"'s own /d switch sets the new window's starting directory - avoids nesting a
rem quoted path inside the cmd /k argument, which Windows batch handles unreliably.
start "Dev Nexus Server" /d "%~dp0" cmd /k npm run dev

echo.
echo Starting up. Once you see "Ready" in the new window, open:
echo   http://localhost:3000
echo.
pause
goto menu

:stop
if !RUNNING!==0 (
    echo.
    echo Not running - nothing to stop.
    pause
    goto menu
)

echo.
rem Killing the shell window alone isn't enough - Turbopack's dev server runs as a
rem separate child process that survives its parent shell being closed.
set FOUND=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
    if !errorlevel!==0 (
        echo [Dev Nexus] Stopped process %%p on port 3000.
        set FOUND=1
    )
)
if !FOUND!==0 echo [Dev Nexus] Nothing was running on port 3000.

echo.
set "STOPMONGO="
set /p STOPMONGO="Also stop MongoDB now? (y/N): "
if /i "!STOPMONGO!"=="y" (
    net stop MongoDB >nul 2>&1
    if !errorlevel!==0 (
        echo [MongoDB] Stopped.
    ) else (
        echo [MongoDB] Could not stop it - try running this file as Administrator.
    )
) else (
    echo MongoDB left running - that's normal, it's meant to stay up.
)

echo.
pause
goto menu

:end
endlocal
exit /b 0

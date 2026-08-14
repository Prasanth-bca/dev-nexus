@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   Dev Nexus - App Updater
echo ============================================
echo.

rem --- [1/9] Detect the project directory (this file always lives at the project root,
rem     same convention as devnexus.bat - "%~dp0" is wherever this .bat was launched from) ---
if not exist "package.json" (
    echo [ERROR] package.json not found in this folder.
    echo         Run update.bat from inside the Dev Nexus project folder.
    pause
    exit /b 1
)
echo [1/9] Project folder: %~dp0
echo.

rem --- [2/9] Git installed? ---
where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed, or not on PATH.
    echo         Install Git from https://git-scm.com/downloads and try again.
    pause
    exit /b 1
)
echo [2/9] Git found.
echo.

rem --- [3/9] Confirm this is a Git repo and read its configured remote + branch.
rem     Uses the branch's actual upstream (not a hardcoded "origin") so this works
rem     whatever remote/branch the install is actually tracking. ---
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERROR] This folder is not a Git repository.
    echo         The updater only works on a git-cloned copy of Dev Nexus.
    pause
    exit /b 1
)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
if "!BRANCH!"=="HEAD" (
    echo [ERROR] This repo is in a detached HEAD state ^(not on a branch^).
    echo         Check out a real branch first, e.g.:  git checkout main
    pause
    exit /b 1
)

for /f "delims=" %%u in ('git rev-parse --abbrev-ref --symbolic-full-name @{u} 2^>nul') do set UPSTREAM=%%u
if "!UPSTREAM!"=="" (
    echo [ERROR] Branch "!BRANCH!" has no upstream remote configured - nothing to pull from.
    echo         Set one up first, e.g.:  git branch --set-upstream-to=origin/!BRANCH!
    pause
    exit /b 1
)

for /f "tokens=1 delims=/" %%r in ("!UPSTREAM!") do set REMOTENAME=%%r
for /f "delims=" %%v in ('git remote get-url !REMOTENAME! 2^>nul') do set REMOTEURL=%%v

echo [3/9] Remote : !REMOTENAME!  ^(!REMOTEURL!^)
echo        Branch : !BRANCH!  -^>  !UPSTREAM!
echo.

rem --- Check whether the dev server is currently running, before touching anything -
rem     also needed later to decide whether to restart it. ---
set RUNNING=0
set SERVERPID=
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set RUNNING=1
    set SERVERPID=%%p
)
if !RUNNING!==1 (
    echo [4/9] Dev Nexus is currently RUNNING ^(pid !SERVERPID!^) - it will be restarted after the update.
) else (
    echo [4/9] Dev Nexus is not currently running.
)
echo.

rem --- [5/9] Local changes are never discarded automatically - this only ever stashes
rem     them (recoverable with "git stash pop"), and only with the user's OK. ---
set DIRTY=0
set STASHED=0
for /f "delims=" %%s in ('git status --porcelain') do set DIRTY=1

if !DIRTY!==1 (
    echo [5/9] You have local changes that are not committed:
    echo.
    git status --short
    echo.
    echo   update.bat will NOT discard these. It can stash them safely instead
    echo   ^(recoverable afterwards with "git stash pop"^), or you can cancel and
    echo   handle them yourself first.
    echo.
    set "STASHCHOICE="
    set /p STASHCHOICE="Stash local changes and continue with the update? (y/N): "
    if /i "!STASHCHOICE!"=="y" (
        git stash push -m "update.bat auto-stash"
        if errorlevel 1 (
            echo [ERROR] Could not stash local changes. Update cancelled - nothing was changed.
            pause
            exit /b 1
        )
        echo [OK] Local changes stashed.
        set STASHED=1
    ) else (
        echo.
        echo Update cancelled - nothing was changed.
        pause
        exit /b 0
    )
) else (
    echo [5/9] No local changes - safe to update.
)
echo.

rem --- Stop the server before pulling/installing - on Windows, files locked by a
rem     running dev server can make "git pull" or "npm install" fail partway through. ---
if !RUNNING!==1 (
    echo Stopping the running server before updating...
    taskkill /PID !SERVERPID! /F >nul 2>&1
    echo [OK] Stopped.
    echo.
)

rem --- [6/9] Pull latest changes. --ff-only refuses to auto-create a merge commit if
rem     history has diverged - it fails cleanly instead of doing something surprising. ---
echo [6/9] Pulling latest changes from !UPSTREAM!...
git pull --ff-only
if errorlevel 1 (
    echo.
    echo [ERROR] git pull failed - see above.
    if !STASHED!==1 echo         Your local changes are safely stashed - run "git stash pop" to get them back.
    pause
    exit /b 1
)
echo [OK] Repository updated.
echo.

rem --- [7/9] Install/update dependencies. ---
echo [7/9] Installing/updating dependencies ^(npm install^)...
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed - see above.
    if !STASHED!==1 echo         Your local changes are still stashed - run "git stash pop" once this is fixed.
    pause
    exit /b 1
)
echo [OK] Dependencies up to date.
echo.

if !STASHED!==1 (
    echo Restoring your stashed local changes...
    git stash pop
    if errorlevel 1 (
        echo [WARN] Could not automatically restore your stashed changes.
        echo        Nothing was lost - run "git stash pop" manually once you're ready.
    ) else (
        echo [OK] Local changes restored.
    )
    echo.
)

rem --- [8/9] Dev Nexus has no separate migration step - MongoDB is schema-less and
rem     database setup only happens once, in `npm run setup`. The closest equivalent
rem     here is the existing read-only health check, which confirms the updated code
rem     still has everything it needs (env vars, Mongo connection, dependencies). ---
echo [8/9] Running health check...
call npm run doctor
if errorlevel 1 (
    echo.
    echo [WARN] Health check found issues - see above. The update itself still succeeded;
    echo        this just means something in your setup needs attention ^(e.g. MongoDB
    echo        not running^). Your .env.local was not touched by this update.
) else (
    echo [OK] Health check passed.
)
echo.

rem --- [9/9] Restart only if it was running before we started. ---
if !RUNNING!==1 (
    echo [9/9] Restarting Dev Nexus...
    start "Dev Nexus Server" /d "%~dp0" cmd /k npm run dev
    echo [OK] Restart triggered in a new window. Once you see "Ready", open http://localhost:3000
) else (
    echo [9/9] Dev Nexus was not running before the update - start it with devnexus.bat when ready.
)

echo.
echo ============================================
echo   Update completed successfully.
echo   Your .env.local and other local config were left untouched.
echo ============================================
pause
exit /b 0

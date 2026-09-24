#!/bin/bash
cd "$(dirname "$0")"

echo "============================================"
echo "  Dev Nexus - App Updater"
echo "============================================"
echo ""

# --- [1/9] Detect project directory ---
if [ ! -f "package.json" ]; then
    echo "[ERROR] package.json not found in this folder."
    echo "        Run update.sh from inside the Dev Nexus project folder."
    read -p "Press Enter to exit..."
    exit 1
fi
echo "[1/9] Project folder: $(pwd)"
echo ""

# --- [2/9] Git installed? ---
if ! command -v git >/dev/null 2>&1; then
    echo "[ERROR] Git is not installed, or not on PATH."
    read -p "Press Enter to exit..."
    exit 1
fi
echo "[2/9] Git found."
echo ""

# --- [3/9] Confirm Git repo & branch ---
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[ERROR] This folder is not a Git repository."
    read -p "Press Enter to exit..."
    exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "HEAD" ]; then
    echo "[ERROR] This repo is in a detached HEAD state (not on a branch)."
    read -p "Press Enter to exit..."
    exit 1
fi

UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
if [ -z "$UPSTREAM" ]; then
    echo "[ERROR] Branch '$BRANCH' has no upstream remote configured."
    read -p "Press Enter to exit..."
    exit 1
fi

REMOTENAME=${UPSTREAM%%/*}
REMOTEURL=$(git remote get-url "$REMOTENAME" 2>/dev/null)

echo "[3/9] Remote: $REMOTENAME ($REMOTEURL)"
echo "      Branch: $BRANCH -> $UPSTREAM"
echo ""

# --- [4/9] Check running server ---
SERVERPID=$(lsof -t -i:3000 -sTCP:LISTEN 2>/dev/null)
RUNNING=0
if [ -n "$SERVERPID" ]; then
    RUNNING=1
    echo "[4/9] Dev Nexus is currently RUNNING (pid $SERVERPID) - it will be restarted."
else
    echo "[4/9] Dev Nexus is not currently running."
fi
echo ""

# --- [5/9] Uncommitted changes ---
DIRTY=0
STASHED=0
if [ -n "$(git status --porcelain)" ]; then
    DIRTY=1
    echo "[5/9] You have local changes that are not committed:"
    echo ""
    git status --short
    echo ""
    echo "  update.sh will NOT discard these. It can stash them safely instead,"
    echo "  or you can cancel and handle them yourself."
    echo ""
    read -p "Stash local changes and continue? (y/N): " STASHCHOICE
    if [[ "$STASHCHOICE" =~ ^[Yy]$ ]]; then
        if ! git stash push -m "update.sh auto-stash"; then
            echo "[ERROR] Could not stash local changes. Cancelled."
            read -p "Press Enter to exit..."
            exit 1
        fi
        echo "[OK] Local changes stashed."
        STASHED=1
    else
        echo "Update cancelled."
        exit 0
    fi
else
    echo "[5/9] No local changes - safe to update."
fi
echo ""

# --- Stop server ---
if [ "$RUNNING" -eq 1 ]; then
    echo "Stopping server before updating..."
    kill -9 "$SERVERPID" >/dev/null 2>&1
    echo "[OK] Stopped."
    echo ""
fi

# --- [6/9] Pull latest changes ---
echo "[6/9] Pulling latest changes from $UPSTREAM..."
if ! git pull --ff-only; then
    echo ""
    echo "[ERROR] git pull failed."
    [ "$STASHED" -eq 1 ] && echo "        Your changes are stashed. Run 'git stash pop' later."
    read -p "Press Enter to exit..."
    exit 1
fi
echo "[OK] Repository updated."
echo ""

# --- [7/9] Install dependencies ---
echo "[7/9] Installing/updating dependencies (npm install)..."
if ! npm install; then
    echo ""
    echo "[ERROR] npm install failed."
    [ "$STASHED" -eq 1 ] && echo "        Changes still stashed. Run 'git stash pop' once fixed."
    read -p "Press Enter to exit..."
    exit 1
fi
echo "[OK] Dependencies up to date."
echo ""

if [ "$STASHED" -eq 1 ]; then
    echo "Restoring stashed changes..."
    if ! git stash pop; then
        echo "[WARN] Could not automatically restore. Run 'git stash pop' manually."
    else
        echo "[OK] Local changes restored."
    fi
    echo ""
fi

# --- [8/9] Health check ---
echo "[8/9] Running health check..."
if ! npm run doctor; then
    echo ""
    echo "[WARN] Health check found issues. Update succeeded, but setup needs attention."
else
    echo "[OK] Health check passed."
fi
echo ""

# --- [9/9] Restart if it was running ---
if [ "$RUNNING" -eq 1 ]; then
    echo "[9/9] Restarting Dev Nexus..."
    nohup npm run dev > devnexus.log 2>&1 &
    echo "[OK] Restarted in background. Check devnexus.log and open http://localhost:3000"
else
    echo "[9/9] Dev Nexus was not running. Start it with devnexus.sh when ready."
fi

echo ""
echo "============================================"
echo "  Update completed successfully."
echo "============================================"
exit 0

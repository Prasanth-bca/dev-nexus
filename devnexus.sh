#!/bin/bash
cd "$(dirname "$0")"

menu() {
    clear
    echo "============================================"
    echo "  Dev Nexus - Control Panel"
    echo "============================================"
    echo ""

    # Check port 3000
    SERVERPID=$(lsof -t -i:3000 -sTCP:LISTEN 2>/dev/null)
    RUNNING=0
    if [ -n "$SERVERPID" ]; then
        RUNNING=1
        echo "  Dev Nexus : RUNNING   (pid $SERVERPID, http://localhost:3000)"
    else
        echo "  Dev Nexus : STOPPED"
    fi

    # Check MongoDB (via docker or port)
    MONGO_RUNNING=0
    if nc -z localhost 27017 2>/dev/null || (docker ps 2>/dev/null | grep -q 'mongodb-devnexus'); then
        MONGO_RUNNING=1
        echo "  MongoDB   : Running"
    else
        echo "  MongoDB   : Stopped"
    fi

    echo ""
    echo "============================================"
    echo "  1. Start Dev Nexus"
    echo "  2. Stop Dev Nexus"
    echo "  3. Refresh status"
    echo "  4. Exit"
    echo "============================================"
    echo ""
    read -p "Choose an option (1-4): " CHOICE
    echo ""

    case "$CHOICE" in
        1) start_app ;;
        2) stop_app ;;
        3) menu ;;
        4) exit 0 ;;
        *) 
            echo "Not a valid option - pick 1, 2, 3, or 4."
            read -p "Press Enter to continue..."
            menu
            ;;
    esac
}

start_app() {
    if [ "$RUNNING" -eq 1 ]; then
        echo "Already running at http://localhost:3000 - nothing to do."
        read -p "Press Enter to continue..."
        menu
        return
    fi
    
    if [ "$MONGO_RUNNING" -eq 1 ]; then
        echo "[MongoDB] Already running."
    else
        echo "[MongoDB] Starting service..."
        if systemctl list-unit-files | grep -q mongod.service 2>/dev/null; then
            sudo systemctl start mongod >/dev/null 2>&1
            echo "[MongoDB] Started."
        elif command -v docker >/dev/null; then
             echo "[MongoDB] Using Docker to start MongoDB..."
             docker start mongodb-devnexus >/dev/null 2>&1 || docker run --name mongodb-devnexus -p 27017:27017 -d mongo >/dev/null 2>&1
             echo "[MongoDB] Started in Docker."
        else
            echo "[MongoDB] Not found via systemctl or Docker. You may need to install it."
        fi
    fi

    echo ""
    echo "[Dev Nexus] Starting the dev server in the background..."
    nohup npm run dev > devnexus.log 2>&1 &
    
    echo ""
    echo "Starting up. Check devnexus.log for logs. Open:"
    echo "  http://localhost:3000"
    echo ""
    read -p "Press Enter to continue..."
    menu
}

stop_app() {
    if [ "$RUNNING" -eq 0 ]; then
        echo "Not running - nothing to stop."
        read -p "Press Enter to continue..."
        menu
        return
    fi

    kill -9 $SERVERPID >/dev/null 2>&1
    echo "[Dev Nexus] Stopped process $SERVERPID on port 3000."
    
    echo ""
    read -p "Also stop MongoDB now? (y/N): " STOPMONGO
    if [[ "$STOPMONGO" =~ ^[Yy]$ ]]; then
        if systemctl list-unit-files | grep -q mongod.service 2>/dev/null; then
            sudo systemctl stop mongod >/dev/null 2>&1
            echo "[MongoDB] Stopped."
        elif docker ps -a | grep -q mongodb-devnexus 2>/dev/null; then
            docker stop mongodb-devnexus >/dev/null 2>&1
            echo "[MongoDB] Docker container stopped."
        fi
    else
        echo "MongoDB left running - that's normal, it's meant to stay up."
    fi

    echo ""
    read -p "Press Enter to continue..."
    menu
}

menu

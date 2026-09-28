# DevNexus - Docker Installation Guide

Complete guide to install and run DevNexus using Docker on a fresh system.

## Prerequisites

- Docker Engine 20.10+ ([Install Docker](https://docs.docker.com/engine/install/))
- Docker Compose v2+ (included with Docker Desktop)
- Git
- 4GB+ RAM available
- 10GB+ disk space

## Quick Start (Recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/Prasanth-bca/dev-nexus.git
cd dev-nexus
```

### 2. Start with Docker Compose

```bash
# Start all services (MongoDB, Redis, DevNexus app)
docker compose up -d

# Check logs
docker compose logs -f

# Access the app
# Open http://localhost:3000 in your browser
```

**Note:** You **don't need a `.env.local` file** for Docker setup. All environment variables are configured in `docker-compose.yml`. If you see an error about `.env.local` not found, you can safely ignore it or the issue will be fixed in the latest version.

### 3. Initial Setup

The app will be running on `http://localhost:3000`. On first visit:

1. You'll be redirected to `/setup`
2. Enter MongoDB connection details (pre-filled for Docker setup):
   - **MongoDB URI:** `mongodb://dev-nexus-mongodb:27017` (internal Docker network)
   - **Database Name:** `dev_nexus`
3. Create admin account:
   - **Email:** your-email@example.com
   - **Password:** your-password
4. Click **Complete Setup**

### 4. Stop Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes all data)
docker compose down -v
```

---

## Manual Docker Setup (Without Compose)

If you prefer to run containers individually:

### 1. Create Docker Network

```bash
docker network create devnexus-network
```

### 2. Start MongoDB

```bash
docker run -d \
  --name dev-nexus-mongodb \
  --network devnexus-network \
  -p 27017:27017 \
  -v dnx-mongodb-data:/data/db \
  mongo:7
```

**Verify MongoDB is running:**
```bash
docker logs dev-nexus-mongodb
```

### 3. Start Redis

```bash
docker run -d \
  --name dev-nexus-redis \
  --network devnexus-network \
  -p 6379:6379 \
  redis:7-alpine
```

**Verify Redis is running:**
```bash
docker logs dev-nexus-redis
```

### 4. Build and Run DevNexus App

```bash
# Build the image
docker build -t devnexus-app .

# Run the app
docker run -d \
  --name dev-nexus \
  --network devnexus-network \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://dev-nexus-mongodb:27017 \
  -e MONGODB_DB=dev_nexus \
  devnexus-app
```

**Check app logs:**
```bash
docker logs -f dev-nexus
```

### 5. Access the Application

Open **http://localhost:3000** in your browser.

---

## Docker Compose Configuration

The `docker-compose.yml` file includes:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: dev-nexus-mongodb
    ports:
      - "27017:27017"
    volumes:
      - dnx-mongodb-data:/data/db
    networks:
      - devnexus

  redis:
    image: redis:7-alpine
    container_name: dev-nexus-redis
    ports:
      - "6379:6379"
    networks:
      - devnexus

  app:
    build: .
    container_name: dev-nexus
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://dev-nexus-mongodb:27017
      - MONGODB_DB=dev_nexus
    depends_on:
      - mongodb
      - redis
    networks:
      - devnexus

volumes:
  dnx-mongodb-data:

networks:
  devnexus:
```

---

## Environment Variables

Create a `.env.local` file (optional, for custom configuration):

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=dev_nexus

# Redis (optional - auto-detects localhost:6379)
# REDIS_URL=redis://localhost:6379

# Gmail Sync Interval (optional)
# GMAIL_SYNC_INTERVAL_MS=60000

# Session Secret (optional - auto-generated if not set)
# SESSION_SECRET=your-secret-key-here
```

---

## Data Persistence

### MongoDB Data

MongoDB data is stored in a named volume `dnx-mongodb-data`. This persists across container restarts.

**Backup MongoDB:**
```bash
docker exec dev-nexus-mongodb mongodump --out /backup
docker cp dev-nexus-mongodb:/backup ./mongodb-backup
```

**Restore MongoDB:**
```bash
docker cp ./mongodb-backup dev-nexus-mongodb:/backup
docker exec dev-nexus-mongodb mongorestore /backup
```

### View Volumes

```bash
# List all volumes
docker volume ls

# Inspect dnx-mongodb-data
docker volume inspect dnx-mongodb-data
```

---

## Troubleshooting

### Port Already in Use

If port 3000, 27017, or 6379 is already occupied:

**Check what's using the port:**
```bash
sudo lsof -i :3000
sudo lsof -i :27017
sudo lsof -i :6379
```

**Change ports in docker-compose.yml:**
```yaml
services:
  app:
    ports:
      - "3001:3000"  # Use port 3001 instead
```

### App Won't Start

**Check container logs:**
```bash
docker compose logs app
docker compose logs mongodb
docker compose logs redis
```

**Common issues:**
- MongoDB not ready: Wait 5-10 seconds after `docker compose up`
- Port conflicts: See "Port Already in Use" above
- Build errors: Run `docker compose build --no-cache`

### Database Connection Failed

**Test MongoDB connection from inside app container:**
```bash
docker exec -it dev-nexus sh
ping dev-nexus-mongodb
```

**Test from host machine:**
```bash
docker exec dev-nexus-mongodb mongosh --eval "db.runCommand({ ping: 1 })"
```

### Clear Everything and Start Fresh

```bash
# Stop and remove all containers
docker compose down

# Remove volumes (⚠️ DELETES ALL DATA)
docker compose down -v

# Remove images
docker rmi devnexus-app

# Start fresh
docker compose up -d --build
```

---

## Development Mode with Docker

For development with hot-reload:

```bash
# Run with volume mount for live code changes
docker run -d \
  --name dev-nexus-dev \
  --network devnexus-network \
  -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  -e MONGODB_URI=mongodb://dev-nexus-mongodb:27017 \
  -e MONGODB_DB=dev_nexus \
  node:20-alpine \
  sh -c "cd /app && npm install && npm run dev"
```

Or use the included `docker-compose.dev.yml`:

```bash
docker compose -f docker-compose.dev.yml up
```

---

## Health Checks

### Check All Services

```bash
# Docker Compose
docker compose ps

# Manual containers
docker ps --filter "name=dev-nexus"
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Database status
curl http://localhost:3000/api/status
```

---

## Production Deployment

For production use:

1. **Use environment variables for secrets** (not `.env.local`):
   ```bash
   docker run -e SESSION_SECRET=$(openssl rand -hex 32) ...
   ```

2. **Enable MongoDB authentication**:
   ```yaml
   mongodb:
     environment:
       MONGO_INITDB_ROOT_USERNAME: admin
       MONGO_INITDB_ROOT_PASSWORD: secure-password
   ```

3. **Use a reverse proxy** (nginx/traefik) for HTTPS

4. **Set resource limits**:
   ```yaml
   app:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 2G
   ```

5. **Regular backups** (see "Data Persistence" section)

---

## Useful Commands

```bash
# View real-time logs
docker compose logs -f

# Restart a specific service
docker compose restart app

# Execute commands in running container
docker exec -it dev-nexus sh

# View resource usage
docker stats

# Clean up unused images/volumes
docker system prune -a
```

---

## Architecture

```
┌─────────────────┐
│   Browser       │
│  localhost:3000 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  dev-nexus      │  Next.js 16.2.12
│  (Node.js app)  │  Port 3000
└────┬────────┬───┘
     │        │
     ▼        ▼
┌─────────┐ ┌──────────┐
│ MongoDB │ │  Redis   │
│ Port    │ │  Port    │
│ 27017   │ │  6379    │
└─────────┘ └──────────┘
```

---

## Next Steps

After installation:

1. **Configure Gmail Integration:**
   - Go to Settings → Gmail
   - Add Gmail App Password
   - Enable background sync

2. **Configure AI Assistant:**
   - Go to AI Assistant → Providers
   - Add Gemini API key or other provider

3. **Explore Modules:**
   - Notes
   - Projects
   - File Vault
   - Activity

---

## Support

- **GitHub Issues:** https://github.com/Prasanth-bca/dev-nexus/issues
- **Documentation:** See `README.md` in the repository
- **Session Context:** See `SESSION_CONTEXT.md` for recent changes

---

**Last Updated:** 2026-09-28

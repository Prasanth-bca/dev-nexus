# Running Dev Nexus with Docker

This documents the plan for running Dev Nexus in a **production standalone** Docker
container, using an **existing external MongoDB** (no MongoDB container in v1).

## Why this works

Dev Nexus is self-bootstrapping, so the container only needs environment variables —
no interactive `npm run setup`:

- Modules auto-register at server boot (`src/lib/kernel/loader.ts` — atomic upsert).
- The admin account is created through the web login page when none exists
  (`src/app/login/LoginForm.tsx`).
- Security keys auto-generate and persist in MongoDB
  (`src/lib/kernel/instance-keys.ts`). Existing `SECRET_MANAGER_KEY`/`SESSION_SECRET`
  are reused to keep already-encrypted secrets decryptable.

## File changes

1. **`next.config.ts`** — add `output: "standalone"` to enable output-file-tracing and
   produce a minimal production image (`.next/standalone` + `server.js`).
2. **`.dockerignore`** — exclude `node_modules`, `.next`, `var/`, `.env*`, logs, `.git`,
   provider scripts/docs.
3. **`Dockerfile`** — multi-stage:
   - `base`: `node:20-alpine`
   - `deps`: copy `package*.json`, run `npm ci`
   - `builder`: copy source, run `npm run build`
   - `runner`: `node:20-alpine`; copy `.next/standalone`, `.next/static`, `public`;
     run `node server.js` with `HOSTNAME=0.0.0.0` and `PORT=3000`; create + chown the
     writable `var/` subdirectories; run as a non-root user; `EXPOSE 3000`.
4. **`docker-compose.yml`** — single `app` service:
   - build from the Dockerfile, publish `3000:3000`
   - `env_file: .env.local` (reuses `SECRET_MANAGER_KEY`, `SESSION_SECRET`, `MONGODB_DB`)
   - `environment:` overrides `MONGODB_URI` to the existing MongoDB
     (`mongodb://host.docker.internal:27017`) and points `FILE_VAULT_DIR`,
     `AVATAR_DIR`, `TRANSFORMERS_CACHE_DIR` at the mounted volumes
   - `extra_hosts: ["host.docker.internal:host-gateway"]` so the container can reach a
     MongoDB running on the host (Linux; out of the box on Docker Desktop)
   - volumes:
     - `./var:/data/var` — file-vault, avatars, backups, exports, temp, logs persist on
       the host
     - `dnx-transformers-cache:/app/.cache` — ~90MB ONNX embedding model downloaded once
5. **`src/lib/integrations/embeddings.ts`** — set `env.cacheDir` from
   `process.env.TRANSFORMERS_CACHE_DIR` (default `/app/.cache`) so the model cache path
   is deterministic and mountable under the standalone build.

## Environment variables

| Variable | Source | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | compose `environment` | Point at existing MongoDB (host-gateway) |
| `MONGODB_DB` | `.env.local` | Database name (`dev_nexus`) |
| `SECRET_MANAGER_KEY` | `.env.local` | Encrypts stored secrets — keep stable |
| `SESSION_SECRET` | `.env.local` | Signs login sessions |
| `FILE_VAULT_DIR` | compose `environment` | `/data/var/file-vault` |
| `AVATAR_DIR` | compose `environment` | `/data/var/avatars` |
| `TRANSFORMERS_CACHE_DIR` | compose `environment` | `/app/.cache` |

## Verification

1. `docker compose up --build`
2. Open `http://localhost:3000`
3. Log in with an existing admin account, or create one through the login page.

## Notes / tradeoffs

- Existing MongoDB must be reachable from the container. If it only binds `127.0.0.1`,
  add an `0.0.0.0` bind or use an SSH tunnel — the compose override uses
  `host.docker.internal` via `extra_hosts: host-gateway`.
- For dev with hot reload (`next dev`), use a separate approach (bind-mounted source +
  `npm run dev`); this setup targets production.
- `var/` is bind-mounted so backups/exports land on the host filesystem like today.
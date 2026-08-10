# Dev Nexus

A personal Developer Automation & Operations Platform — a single dashboard combining
notes, an AI assistant, Gmail, GitHub, a file vault, activity tracking, and a projects
workspace that links them all together. See [VISION.md](VISION.md) for the full story
and [ARCHITECTURE.md](ARCHITECTURE.md) for how it's built.

## Quick Start

```bash
git clone <repo-url>
cd dev-nexus
npm install
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). That's it — no manual `.env` editing,
no hand-generated keys. `npm run setup` walks you through everything interactively:

- Checks your Node.js/npm version and file permissions
- Creates `.env.local` from `.env.example` (or offers to regenerate it, backing up the old
  one first)
- Generates your encryption and session-signing keys automatically
- Connects to MongoDB (prompts for the URI, validates the connection, retries on failure)
- Registers every module and creates the folders uploads/exports/backups need
- Creates your admin account
- Validates everything end-to-end and prints a completion summary

AI Assistant, Gmail, and GitHub integrations are optional — connect them after your first
login from the setup wizard that opens automatically, or anytime later from
**Settings → Re-run Setup Wizard**.

### Prerequisites

- **Node.js 20+** and npm
- **MongoDB**, running locally (or a connection string to a remote instance) — see
  [DEPLOYMENT.md](DEPLOYMENT.md) for install instructions per OS

## CLI Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the app in development mode |
| `npm run build` / `npm run start` | Production build and start |
| `npm run setup` | Interactive first-time installer (see above) — safe to re-run, skips whatever's already done |
| `npm run doctor` | Read-only health check: system requirements, dependencies, database, storage, secrets, auth, modules |
| `npm run backup` | Backs up MongoDB data, uploaded files, and configuration into a timestamped zip under `var/backups/` |
| `npm run restore` | Restores from a backup zip (validates it first, asks for confirmation — this replaces current data) |
| `npm run reset` | Wipes all application data so the app starts fresh next run (optionally keeps uploaded files) — asks for confirmation twice |
| `npm run lint` | ESLint |

All of the above live under [`scripts/`](scripts/) — `setup/`, `doctor/`, `backup/`,
`restore/`, `reset/`, and a `shared/` folder of reusable CLI utilities (prompts, logging,
env-file handling, path constants, system checks) they all build on.

## Learn More

- [SETUP.md](SETUP.md) — full setup guide: prerequisites, what the wizard does step by step, troubleshooting
- [ARCHITECTURE.md](ARCHITECTURE.md) — module contract, kernel design, data model
- [VISION.md](VISION.md) — why this project exists
- [DEPLOYMENT.md](DEPLOYMENT.md) — moving an existing install to another machine
- [GUIDELINES.md](GUIDELINES.md) — UI/code conventions

Built with [Next.js](https://nextjs.org), MongoDB, TypeScript, Tailwind, and shadcn/ui.

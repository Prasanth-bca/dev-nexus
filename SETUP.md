# Dev Nexus — Setup Guide

This is the single guide for getting Dev Nexus running, whether that's your own machine or
a friend's. Moving an *existing* install's data to another machine is a separate process —
see [DEPLOYMENT.md](DEPLOYMENT.md) for that instead.

## 1. Prerequisites

- **Node.js 20 or newer** — [nodejs.org](https://nodejs.org)
- **MongoDB**, running locally (or a connection string to a remote instance you already have)
  - Windows: `winget install MongoDB.Server` — registers as an auto-start Windows service
  - Mac: `brew install mongodb-community && brew services start mongodb-community`
  - Linux: follow MongoDB's official apt/yum repo instructions for your distro
- **Git**

You do **not** need to install or configure anything else by hand — no `.env` file to
write, no encryption keys to generate. `npm run setup` does all of that.

## 2. Install

```bash
git clone <repo-url>
cd dev-nexus
npm install
npm run setup
```

`npm install` pulls in `@huggingface/transformers` (powers Notes' on-device Semantic
Search) and its native ONNX runtime binaries — a heavier install than typical, and it'll
download a small (~90MB) embedding model automatically the first time Semantic Search
actually runs. No action needed, just don't be surprised by it.

## 3. What `npm run setup` actually does

It's an interactive wizard — answer a few prompts and it handles the rest:

1. **System check** — confirms your Node/npm version, OS, and file permissions are OK.
2. **Environment file** — creates `.env.local` from `.env.example`. If one already exists,
   it asks before touching it, and backs up the old one rather than overwriting silently.
3. **Security keys** — generates your `SECRET_MANAGER_KEY` (encrypts stored secrets like
   API keys) and `SESSION_SECRET` (signs login sessions) with Node's `crypto` module. You
   never see or need to understand these values.
4. **MongoDB** — asks for a connection URI (defaults to `mongodb://127.0.0.1:27017`) and a
   database name (defaults to `dev_nexus`), tests the connection, and lets you retry if it
   fails instead of aborting the whole install.
5. **Database & modules** — registers every module (Notes, AI Assistant, Gmail, GitHub,
   File Vault, Activity, Projects, …) in MongoDB. Each module creates its own collection
   indexes automatically the first time you actually run `npm run dev`.
6. **Admin account** — asks for an email and password (min 8 characters, confirmed twice).
   Skipped automatically if an admin already exists — safe to re-run.
7. **Storage folders** — creates `var/file-vault`, `var/temp`, `var/logs`, `var/exports`,
   `var/backups` (only whichever don't already exist).
8. **Validation** — independently re-checks everything above (doesn't just trust it worked)
   and prints a clear pass/fail for each.
9. **Completion screen** — tells you what's ready and what to do next.

Every step is **idempotent** — re-running `npm run setup` on an already-configured install
safely skips whatever's already done instead of erroring or duplicating anything.

## 4. Start it

```bash
npm run dev
```

Open **http://localhost:3000**, log in with the admin account you just created, and you'll
land in a second, web-based setup wizard for the pieces that genuinely need a browser:

- **AI Assistant** — pick a provider (Anthropic/OpenAI/Groq/custom) and paste an API key
- **Gmail** — a real Google OAuth connection, which can only happen through a browser redirect
- **GitHub** — paste a personal access token

All three are optional and individually skippable — skip any (or all) of them and connect
later from **Settings → Re-run Setup Wizard**, or from each module's own Settings tab.

## 5. Other commands

| Command | What it does | When to use it |
| --- | --- | --- |
| `npm run doctor` | Read-only health check — system requirements, dependencies, database, storage, secrets, auth, modules | Something seems broken and you want a diagnosis before poking around |
| `npm run backup` | Backs up MongoDB data, uploaded files, and configuration into `var/backups/YYYY-MM-DD-HH-MM.zip` | Before a risky change, or on a schedule |
| `npm run restore` | Restores from a backup zip — validates it first, asks for confirmation, warns if the backup's encryption key doesn't match your current one | Recovering from a mistake, or moving data onto a fresh install |
| `npm run reset` | Wipes all application data (optionally keeps uploaded files) so the app starts fresh next run — double-confirmed, leaves `.env.local` untouched | Starting over without reinstalling |

## Troubleshooting

**`npm run setup` can't connect to MongoDB.** Confirm it's actually running
(`mongod` as a service, or `brew services list` / `sc query MongoDB` depending on OS)
before retrying — the wizard will loop on this step until it succeeds or you choose to
continue without a verified connection.

**I ran `npm run setup` again by mistake.** Nothing bad happens — it's designed to be
safely re-run. It'll skip your existing `.env.local` (asking first), skip admin account
creation (one already exists), and skip anything else already in place.

**I want to change my MongoDB URI or regenerate my keys.** Re-run `npm run setup` and
choose to regenerate `.env.local` when asked — your old one is backed up alongside it
first (e.g. `.env.local.backup-<timestamp>`), never silently lost.

**Something's actually broken.** Run `npm run doctor` first — it's read-only and gives a
line-by-line answer for exactly which piece (database, storage, secrets, auth, modules,
dependencies) is unhealthy.

## Learn more

- [DEPLOYMENT.md](DEPLOYMENT.md) — moving an *existing* install's data to another machine
- [ARCHITECTURE.md](ARCHITECTURE.md) — module contract, kernel design, data model
- [.env.example](.env.example) — every environment variable Dev Nexus reads, documented

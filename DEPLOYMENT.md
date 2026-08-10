# Moving Dev Nexus to Another System

This covers taking an **existing** Dev Nexus install and moving it — or its data — to a
different machine. If you're setting up Dev Nexus for the first time (yours or someone
else's), use [SETUP.md](SETUP.md) instead — `npm run setup` handles everything manual
steps used to require.

There are two versions of this:

- **Fresh install** — new empty database, reconnect integrations yourself, nothing carries
  over. This is just [SETUP.md](SETUP.md) run on the new machine.
- **Full migration** — bring your existing notes/files/history/connected integrations
  across. Covered below.

## Fresh install

1. Follow [SETUP.md](SETUP.md) on the new machine end to end (`git clone`, `npm install`,
   `npm run setup`, `npm run dev`).
2. Reconnect what needs reconnecting, since this is a fresh database:
   - **AI Assistant** → Providers tab → re-add your Anthropic/OpenAI/Groq API key
   - **Gmail** → Settings → OAuth Client ID/Secret, then reconnect
   - **GitHub** → Settings → paste a personal access token
   - Notes, File Vault, and Activity history all start empty

That's it — no manual `.env.local` editing, no hand-generated keys.

## Full migration (bring your data across)

This uses the app's own backup/restore tooling rather than manual `mongodump` — it
validates the backup before touching anything and warns you if encryption keys don't
match, instead of silently producing undecryptable secrets.

1. **On the old machine**, run:
   ```bash
   npm run backup
   ```
   This writes `var/backups/YYYY-MM-DD-HH-MM.zip`, containing your MongoDB data, uploaded
   files, and `.env.local` (encryption keys included) all together.
2. Copy that zip file to the new machine (a USB drive, a private file transfer — treat it
   like a credentials file, since it contains one).
3. **On the new machine**, clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd dev-nexus
   npm install
   ```
4. Run the restore, pointing at the copied zip:
   ```bash
   npm run restore -- path/to/2026-08-08-17-01.zip
   ```
   It shows you what's in the backup, asks for confirmation, and — this is the part manual
   `mongodump`/`mongorestore` doesn't do for you — explicitly asks whether to also restore
   `.env.local`. Say **yes** for a full migration: your stored Gmail/GitHub/AI secrets were
   encrypted with the old machine's `SECRET_MANAGER_KEY`, and restoring the database
   without also restoring that key leaves them permanently undecryptable.
5. Start it:
   ```bash
   npm run dev
   ```
   Open **http://localhost:3000** and log in with your existing admin account — nothing
   further to reconnect.

If the new machine is also Windows, copy `devnexus.bat` over too (already in the repo) —
it works as-is, since it only depends on `netstat`/`sc`/`net start`, no hardcoded paths.

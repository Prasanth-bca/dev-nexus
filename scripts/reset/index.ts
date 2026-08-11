import "../shared/bootstrap";
import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { banner, step, ok, warn, info, blank } from "../shared/logger";
import { askConfirm } from "../shared/prompt";
import { STORAGE_DIRS } from "../shared/paths";

/**
 * Wipes application STATE (every MongoDB collection, optionally uploaded files) — not the
 * installation itself. .env.local is deliberately left untouched: MongoDB URI and security
 * keys keep working, so `npm run dev` boots straight back into the first-run admin-account
 * screen (the exact same "no admin exists yet" detection /login already uses) instead of
 * also needing a re-run of `npm run setup`.
 */
async function main() {
  banner("⚠️  Dev Nexus Reset", "Wipes all application data. This cannot be undone.");

  warn("This deletes every collection in your MongoDB database (notes, projects, secrets, activity, everything).");
  warn("Consider running `npm run backup` first if you want a way back.");
  blank();

  const proceed = await askConfirm("Are you absolutely sure you want to reset Dev Nexus?", false);
  if (!proceed) {
    info("Reset cancelled — nothing was changed.");
    process.exit(0);
  }

  const confirmAgain = await askConfirm("This cannot be undone. Confirm one more time?", false);
  if (!confirmAgain) {
    info("Reset cancelled — nothing was changed.");
    process.exit(0);
  }

  const preserveFiles = await askConfirm("Preserve uploaded files (var/file-vault)?", true);

  const { getDb } = await import("@/lib/kernel/db");
  const db = await getDb();

  step("Dropping database collections…");
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of collections) {
    if (name.startsWith("system.")) continue;
    await db.collection(name).drop().catch(() => {});
    ok(name);
  }

  if (!preserveFiles && existsSync(STORAGE_DIRS.fileVault)) {
    step("Removing uploaded files…");
    await rm(STORAGE_DIRS.fileVault, { recursive: true, force: true });
    ok("var/file-vault removed");
  } else if (preserveFiles) {
    info("Uploaded files preserved.");
  }

  // Avatars are tied 1:1 to the admin account being wiped above (not durable content like
  // File Vault uploads), so they're always removed here regardless of preserveFiles.
  if (existsSync(STORAGE_DIRS.avatars)) {
    await rm(STORAGE_DIRS.avatars, { recursive: true, force: true });
    ok("var/avatars removed");
  }

  blank();
  ok("Reset complete. Run `npm run dev` and open http://localhost:3000 to create a new admin account.");
  blank();

  process.exit(0);
}

main().catch((err) => {
  console.error("\nReset failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

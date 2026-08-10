import "../shared/bootstrap";
import path from "node:path";
import { existsSync, readdirSync, copyFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import AdmZip from "adm-zip";
import { banner, step, ok, fail, warn, info, blank } from "../shared/logger";
import { askText, askConfirm } from "../shared/prompt";
import { STORAGE_DIRS, ENV_LOCAL_PATH, PROJECT_ROOT } from "../shared/paths";
import { parseEnvFile, readEnvFile } from "../shared/env-file";
import { deserializeCollection, restoreCollection } from "../shared/db-dump";

interface BackupManifest {
  createdAt: string;
  collections: string[];
  includesFiles: boolean;
  includesEnv: boolean;
}

async function pickBackupPath(): Promise<string | null> {
  const argPath = process.argv[2];
  if (argPath) return path.isAbsolute(argPath) ? argPath : path.join(PROJECT_ROOT, argPath);

  if (!existsSync(STORAGE_DIRS.backups)) return null;
  const zips = readdirSync(STORAGE_DIRS.backups)
    .filter((f) => f.endsWith(".zip"))
    .sort()
    .reverse();
  if (zips.length === 0) return null;

  step("Available backups:");
  zips.forEach((f, i) => info(`${i + 1}. ${f}`));
  const choice = await askText(`Which backup? (1-${zips.length})`, "1");
  const index = Number(choice) - 1;
  if (Number.isNaN(index) || index < 0 || index >= zips.length) return null;
  return path.join(STORAGE_DIRS.backups, zips[index]);
}

/** Validates the archive is a well-formed Dev Nexus backup before touching anything. */
function readManifest(zip: AdmZip): BackupManifest | null {
  const entry = zip.getEntry("manifest.json");
  if (!entry) return null;
  try {
    return JSON.parse(zip.readAsText(entry)) as BackupManifest;
  } catch {
    return null;
  }
}

async function main() {
  banner("♻️  Dev Nexus Restore", "Restores MongoDB data, uploaded files, and configuration from a backup.");

  const backupPath = await pickBackupPath();
  if (!backupPath || !existsSync(backupPath)) {
    fail(`No backup found${backupPath ? ` at ${backupPath}` : " — run `npm run backup` first"}.`);
    process.exit(1);
  }

  const zip = new AdmZip(backupPath);
  const manifest = readManifest(zip);
  if (!manifest) {
    fail("This doesn't look like a valid Dev Nexus backup (missing or unreadable manifest.json).");
    process.exit(1);
  }

  step("Backup details");
  info(`Created: ${manifest.createdAt}`);
  info(`Collections: ${manifest.collections.join(", ")}`);
  info(`Includes uploaded files: ${manifest.includesFiles ? "yes" : "no"}`);
  info(`Includes .env.local: ${manifest.includesEnv ? "yes" : "no"}`);

  blank();
  warn("Restoring replaces your current database collections with the backup's contents.");
  const proceed = await askConfirm("Continue with restore?", false);
  if (!proceed) {
    info("Restore cancelled.");
    process.exit(0);
  }

  // A restored `secrets` collection is only decryptable with the SECRET_MANAGER_KEY that
  // encrypted it — if the backup's .env doesn't match what's currently configured, warn
  // loudly rather than silently leaving every stored secret unreadable after restore.
  const envEntry = manifest.includesEnv ? zip.getEntry("env/.env.local") : null;
  if (envEntry) {
    const backupEnv = parseEnvFile(zip.readAsText(envEntry));
    const currentEnv = readEnvFile(ENV_LOCAL_PATH);
    if (backupEnv.SECRET_MANAGER_KEY && currentEnv.SECRET_MANAGER_KEY && backupEnv.SECRET_MANAGER_KEY !== currentEnv.SECRET_MANAGER_KEY) {
      warn("This backup's encryption key differs from your current one.");
      warn("Restoring the `secrets` collection without also restoring .env.local will leave those secrets undecryptable.");
    }
    const restoreEnv = await askConfirm(
      "Also restore .env.local from the backup? (overwrites your current MongoDB URI and keys)",
      false
    );
    if (restoreEnv) {
      if (existsSync(ENV_LOCAL_PATH)) copyFileSync(ENV_LOCAL_PATH, `${ENV_LOCAL_PATH}.backup-${Date.now()}`);
      writeFileSync(ENV_LOCAL_PATH, zip.readAsText(envEntry), "utf8");
      ok(".env.local restored (previous version backed up alongside it)");
    }
  }

  const { getDb } = await import("@/lib/kernel/db");
  const db = await getDb();

  step("Restoring database…");
  for (const name of manifest.collections) {
    const entry = zip.getEntry(`database/${name}.json`);
    if (!entry) {
      warn(`${name} — missing from archive, skipped`);
      continue;
    }
    const documents = deserializeCollection(zip.readAsText(entry));
    await restoreCollection(db, name, documents);
    ok(`${name} — ${documents.length} document${documents.length === 1 ? "" : "s"} restored`);
  }

  if (manifest.includesFiles) {
    step("Restoring uploaded files…");
    await mkdir(STORAGE_DIRS.fileVault, { recursive: true });
    // Per-entry extraction, not extractAllTo — that extracts the WHOLE archive (database/,
    // manifest.json, env/ included) into targetPath, which would litter the project root
    // with everything else the backup contains. Only the files/file-vault/* entries belong
    // on disk here; maintainEntryPath=false flattens them directly into STORAGE_DIRS.fileVault,
    // matching how storage.ts already stores every upload as a flat generated-UUID filename.
    const fileEntries = zip.getEntries().filter((e) => !e.isDirectory && e.entryName.startsWith("files/file-vault/"));
    for (const entry of fileEntries) {
      zip.extractEntryTo(entry, STORAGE_DIRS.fileVault, false, true);
    }
    ok(`File Vault uploads restored (${fileEntries.length} file${fileEntries.length === 1 ? "" : "s"})`);
  }

  blank();
  ok("Restore complete. Run `npm run doctor` to confirm everything is healthy.");
  blank();
  process.exit(0);
}

main().catch((err) => {
  console.error("\nRestore failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

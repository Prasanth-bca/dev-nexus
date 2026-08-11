import "../shared/bootstrap";
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import AdmZip from "adm-zip";
import { banner, step, ok, info, blank, rule } from "../shared/logger";
import { STORAGE_DIRS, ENV_LOCAL_PATH, PROJECT_ROOT } from "../shared/paths";
import { dumpDatabase, serializeCollection } from "../shared/db-dump";

function timestampName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

async function main() {
  banner("📦 Dev Nexus Backup", "Backs up MongoDB data, uploaded files, and configuration.");

  const { getDb } = await import("@/lib/kernel/db");
  const db = await getDb();

  step("Dumping database…");
  const collections = await dumpDatabase(db);
  for (const c of collections) {
    info(`${c.name} — ${c.documents.length} document${c.documents.length === 1 ? "" : "s"}`);
  }
  ok(`${collections.length} collections dumped`);

  const zip = new AdmZip();
  for (const c of collections) {
    zip.addFile(`database/${c.name}.json`, Buffer.from(serializeCollection(c.documents)));
  }

  step("Archiving uploaded files…");
  if (existsSync(STORAGE_DIRS.fileVault)) {
    zip.addLocalFolder(STORAGE_DIRS.fileVault, "files/file-vault");
    ok("File Vault uploads archived");
  } else {
    info("No File Vault uploads yet");
  }
  if (existsSync(STORAGE_DIRS.avatars)) {
    zip.addLocalFolder(STORAGE_DIRS.avatars, "files/avatars");
    ok("Profile avatars archived");
  }

  step("Archiving configuration…");
  let includesEnv = false;
  if (existsSync(ENV_LOCAL_PATH)) {
    zip.addLocalFile(ENV_LOCAL_PATH, "env", ".env.local");
    includesEnv = true;
    ok(".env.local included (contains your encryption key — keep this backup private)");
  } else {
    info("No .env.local found to include");
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    collections: collections.map((c) => c.name),
    includesFiles: existsSync(STORAGE_DIRS.fileVault),
    includesAvatars: existsSync(STORAGE_DIRS.avatars),
    includesEnv,
    warning:
      "This archive can contain encrypted secrets and the key to decrypt them (.env.local) side by side. Store it as securely as you would any other credential.",
  };
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));

  await mkdir(STORAGE_DIRS.backups, { recursive: true });
  const outputPath = path.join(STORAGE_DIRS.backups, `${timestampName()}.zip`);
  await zip.writeZipPromise(outputPath);

  blank();
  rule();
  ok(`Backup written to ${path.relative(PROJECT_ROOT, outputPath)}`);
  rule();
  blank();

  process.exit(0);
}

main().catch((err) => {
  console.error("\nBackup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

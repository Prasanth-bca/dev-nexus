import path from "node:path";

/** npm always runs scripts with cwd set to the package root, so this is never hardcoded. */
export const PROJECT_ROOT = process.cwd();

export const ENV_LOCAL_PATH = path.join(PROJECT_ROOT, ".env.local");
export const ENV_EXAMPLE_PATH = path.join(PROJECT_ROOT, ".env.example");

export const VAR_DIR = path.join(PROJECT_ROOT, "var");

/** Mirrors the existing FILE_VAULT_DIR override in src/modules/file-vault/server/storage.ts
 *  so the CLI and the running app always agree on where uploads live. */
export const STORAGE_DIRS = {
  fileVault: process.env.FILE_VAULT_DIR || path.join(VAR_DIR, "file-vault"),
  temp: path.join(VAR_DIR, "temp"),
  logs: path.join(VAR_DIR, "logs"),
  exports: path.join(VAR_DIR, "exports"),
  backups: path.join(VAR_DIR, "backups"),
};

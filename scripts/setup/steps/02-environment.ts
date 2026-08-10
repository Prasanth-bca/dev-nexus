import { existsSync, copyFileSync } from "node:fs";
import { step, ok, info } from "../../shared/logger";
import { askConfirm } from "../../shared/prompt";
import { ENV_LOCAL_PATH, ENV_EXAMPLE_PATH } from "../../shared/paths";
import { loadEnvFile } from "../../shared/env-file";

/** Step 2 — Environment Setup. Creates .env.local from .env.example if missing; if it
 *  already exists, asks before overwriting and backs up the old one rather than losing it. */
export async function run(): Promise<void> {
  step("Setting up environment…");

  if (!existsSync(ENV_LOCAL_PATH)) {
    copyFileSync(ENV_EXAMPLE_PATH, ENV_LOCAL_PATH);
    ok(".env.local created from .env.example");
  } else {
    const overwrite = await askConfirm(".env.local already exists — regenerate it? (your MongoDB URI and keys will be re-prompted)", false);
    if (overwrite) {
      const backupPath = `${ENV_LOCAL_PATH}.backup-${Date.now()}`;
      copyFileSync(ENV_LOCAL_PATH, backupPath);
      copyFileSync(ENV_EXAMPLE_PATH, ENV_LOCAL_PATH);
      ok(`Existing .env.local backed up to ${backupPath}, fresh template written`);
    } else {
      ok(".env.local kept as-is");
    }
  }

  // Re-load — later steps (keys, MongoDB) need whatever this step just wrote to be visible
  // in process.env before their own dynamic kernel imports resolve.
  loadEnvFile();
  info(`Using ${ENV_LOCAL_PATH}`);
}

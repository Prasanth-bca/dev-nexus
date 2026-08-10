import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { step, ok } from "../../shared/logger";
import { STORAGE_DIRS } from "../../shared/paths";

/** Step 7 — Initialize Storage. Only creates what's missing; existing uploads
 *  (var/file-vault) are never touched. */
export async function run(): Promise<void> {
  step("Creating storage folders…");

  for (const [name, dir] of Object.entries(STORAGE_DIRS)) {
    const alreadyExisted = existsSync(dir);
    await mkdir(dir, { recursive: true });
    ok(`${name} — ${alreadyExisted ? "already existed" : "created"} (${dir})`);
  }
}

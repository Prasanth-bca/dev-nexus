import crypto from "node:crypto";
import { step, ok } from "../../shared/logger";
import { ENV_LOCAL_PATH } from "../../shared/paths";
import { readEnvFile, writeEnvFile, loadEnvFile } from "../../shared/env-file";

function randomKey(): string {
  return crypto.randomBytes(32).toString("base64");
}

/** Step 3 — Security Keys. Fills in SECRET_MANAGER_KEY/SESSION_SECRET in .env.local if
 *  either is blank, using Node's crypto module — never asks the user to generate anything.
 *  Leaves already-set values untouched (re-running setup shouldn't rotate live keys and
 *  strand already-encrypted secrets). */
export async function run(): Promise<void> {
  step("Generating security keys…");

  const values = readEnvFile(ENV_LOCAL_PATH);
  let changed = false;

  if (!values.SECRET_MANAGER_KEY) {
    values.SECRET_MANAGER_KEY = randomKey();
    changed = true;
    ok("Secret Manager encryption key generated");
  } else {
    ok("Secret Manager encryption key already set");
  }

  if (!values.SESSION_SECRET) {
    values.SESSION_SECRET = randomKey();
    changed = true;
    ok("Session signing secret generated");
  } else {
    ok("Session signing secret already set");
  }

  if (changed) writeEnvFile(ENV_LOCAL_PATH, values);
  loadEnvFile();
}

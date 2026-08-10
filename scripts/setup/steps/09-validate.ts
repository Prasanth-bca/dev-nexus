import { existsSync } from "node:fs";
import { step, ok, fail } from "../../shared/logger";
import { ENV_LOCAL_PATH, STORAGE_DIRS } from "../../shared/paths";

export interface ValidationResult {
  environment: boolean;
  database: boolean;
  storage: boolean;
  secrets: boolean;
  authentication: boolean;
  modules: boolean;
}

/** Step 9 — Validate Configuration. Independently re-verifies everything rather than
 *  trusting that the earlier steps succeeded, so a completion screen never claims
 *  something is ready when it isn't. */
export async function run(): Promise<ValidationResult> {
  step("Validating configuration…");

  const environment = existsSync(ENV_LOCAL_PATH);
  report("Environment file", environment);

  const { getDb } = await import("@/lib/kernel/db");
  let database = false;
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    database = true;
  } catch {
    database = false;
  }
  report("Database connection", database);

  const storage = Object.values(STORAGE_DIRS).every((dir) => existsSync(dir));
  report("Storage folders", storage);

  const { getSecretManagerKeyBase64, getSessionSecretBase64 } = await import("@/lib/kernel/instance-keys");
  let secrets = false;
  try {
    const [key, session] = await Promise.all([getSecretManagerKeyBase64(), getSessionSecretBase64()]);
    secrets = Buffer.from(key, "base64").length === 32 && Buffer.from(session, "base64").length === 32;
  } catch {
    secrets = false;
  }
  report("Secrets & encryption keys", secrets);

  const { hasAnyUser } = await import("@/lib/kernel/auth-password");
  const authentication = database && (await hasAnyUser().catch(() => false));
  report("Authentication (admin account)", authentication);

  // Queries the `modules` collection directly rather than importing @/modules/registry —
  // that file transitively pulls in client React/CSS code that can't run standalone
  // outside Next.js's bundler (see 05-database-init.ts for the full explanation).
  let modules = false;
  try {
    const modulesCollection = (await getDb()).collection<{ enabled: boolean }>("modules");
    modules = (await modulesCollection.countDocuments({ enabled: true })) > 0;
  } catch {
    modules = false;
  }
  report("Modules", modules);

  return { environment, database, storage, secrets, authentication, modules };
}

function report(label: string, passed: boolean): void {
  if (passed) ok(label);
  else fail(label);
}

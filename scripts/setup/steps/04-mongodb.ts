import { MongoClient } from "mongodb";
import { step, ok, fail, warn } from "../../shared/logger";
import { askText, askConfirm } from "../../shared/prompt";
import { ENV_LOCAL_PATH } from "../../shared/paths";
import { readEnvFile, writeEnvFile, loadEnvFile } from "../../shared/env-file";

/** A short-lived connection just to validate the URI — deliberately not the kernel's
 *  getDb(), whose global-promise caching exists for Next.js dev hot-reload and isn't
 *  appropriate for a one-shot CLI check. */
async function testConnection(uri: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not connect." };
  } finally {
    await client.close().catch(() => {});
  }
}

/** Step 4 — MongoDB Setup. Prompts for a URI + database name, validates the connection,
 *  and retries on failure instead of failing the whole install outright. */
export async function run(): Promise<void> {
  step("Connecting to MongoDB…");

  const values = readEnvFile(ENV_LOCAL_PATH);
  let uri = values.MONGODB_URI || "mongodb://127.0.0.1:27017";
  let dbName = values.MONGODB_DB || "dev_nexus";

  for (;;) {
    uri = await askText("MongoDB URI", uri);
    dbName = await askText("Database name", dbName);

    const result = await testConnection(uri);
    if (result.ok) {
      ok(`Connected to ${uri}`);
      break;
    }

    fail(`Could not connect: ${result.error}`);
    const retry = await askConfirm("Retry with a different URI?", true);
    if (!retry) {
      warn("Continuing without a verified connection — later steps will fail until MongoDB is reachable.");
      break;
    }
  }

  values.MONGODB_URI = uri;
  values.MONGODB_DB = dbName;
  writeEnvFile(ENV_LOCAL_PATH, values);
  loadEnvFile();
}

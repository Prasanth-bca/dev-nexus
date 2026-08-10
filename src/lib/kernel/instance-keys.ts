import { getDb } from "./db";

const COLLECTION = "instance_keys";

interface InstanceKeysDoc {
  _id: "keys";
  secretManagerKey: string;
  sessionSecret: string;
  createdAt: Date;
}

function randomBase64(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

let cached: { secretManagerKey: string; sessionSecret: string } | null = null;

/**
 * Auto-provisions the two keys the app needs to boot (secret encryption + session
 * signing) so a fresh install never requires the user to hand-generate or paste
 * anything — this is what the First-Time Setup Wizard relies on to need zero
 * env-var editing. Stored in Mongo rather than a local file so they survive a
 * mongodump/mongorestore migration automatically, keeping previously-encrypted
 * secrets decryptable on the new machine. An explicit SECRET_MANAGER_KEY/
 * SESSION_SECRET env var still overrides this, for advanced/manual setups.
 *
 * $setOnInsert + upsert makes first-boot key creation atomic even if two
 * requests race to create the doc simultaneously.
 */
async function loadOrCreate(): Promise<{ secretManagerKey: string; sessionSecret: string }> {
  if (cached) return cached;
  const db = await getDb();
  const collection = db.collection<InstanceKeysDoc>(COLLECTION);

  const fresh: InstanceKeysDoc = {
    _id: "keys",
    secretManagerKey: randomBase64(32),
    sessionSecret: randomBase64(32),
    createdAt: new Date(),
  };
  await collection.updateOne({ _id: "keys" }, { $setOnInsert: fresh }, { upsert: true });
  const doc = await collection.findOne({ _id: "keys" });
  cached = { secretManagerKey: doc!.secretManagerKey, sessionSecret: doc!.sessionSecret };
  return cached;
}

export async function getSecretManagerKeyBase64(): Promise<string> {
  return process.env.SECRET_MANAGER_KEY || (await loadOrCreate()).secretManagerKey;
}

export async function getSessionSecretBase64(): Promise<string> {
  return process.env.SESSION_SECRET || (await loadOrCreate()).sessionSecret;
}

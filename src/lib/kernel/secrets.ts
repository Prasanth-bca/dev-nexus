import crypto from "crypto";
import { getDb } from "./db";
import { getSecretManagerKeyBase64 } from "./instance-keys";

const ALGO = "aes-256-gcm";
const COLLECTION = "secrets";

async function getKey(): Promise<Buffer> {
  const raw = await getSecretManagerKeyBase64();
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("SECRET_MANAGER_KEY must decode to exactly 32 bytes (base64-encoded).");
  }
  return key;
}

interface SecretDoc {
  name: string;
  iv: string;
  value: string;
  authTag: string;
  updatedAt: Date;
  /** Optional Projects-module link — a plain string (the project's ObjectId), not an ObjectId
   *  type, so this kernel file stays free of a dependency on any specific module. */
  projectId?: string;
}

export async function setSecret(name: string, value: string): Promise<void> {
  const db = await getDb();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, await getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  await db.collection<SecretDoc>(COLLECTION).updateOne(
    { name },
    {
      $set: {
        name,
        iv: iv.toString("base64"),
        value: encrypted.toString("base64"),
        authTag: authTag.toString("base64"),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function getSecret(name: string): Promise<string> {
  const db = await getDb();
  const doc = await db.collection<SecretDoc>(COLLECTION).findOne({ name });
  if (!doc) throw new Error(`Secret "${name}" is not set. Configure it in Secret Manager first.`);
  const decipher = crypto.createDecipheriv(ALGO, await getKey(), Buffer.from(doc.iv, "base64"));
  decipher.setAuthTag(Buffer.from(doc.authTag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(doc.value, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}

export async function listSecretNames(): Promise<{ name: string; updatedAt: string; projectId?: string }[]> {
  const db = await getDb();
  const docs = await db
    .collection<SecretDoc>(COLLECTION)
    .find({}, { projection: { name: 1, updatedAt: 1, projectId: 1 } })
    .sort({ name: 1 })
    .toArray();
  return docs.map((d) => ({ name: d.name, updatedAt: d.updatedAt.toISOString(), projectId: d.projectId }));
}

export async function deleteSecret(name: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ name });
}

/** Assigns (or clears, with `null`) which project a secret belongs to. Doesn't touch the encrypted value. */
export async function setSecretProject(name: string, projectId: string | null): Promise<void> {
  const db = await getDb();
  if (projectId) {
    await db.collection<SecretDoc>(COLLECTION).updateOne({ name }, { $set: { projectId } });
  } else {
    await db.collection<SecretDoc>(COLLECTION).updateOne({ name }, { $unset: { projectId: "" } });
  }
}

export async function listSecretsByProject(projectId: string): Promise<{ name: string; updatedAt: string }[]> {
  const db = await getDb();
  const docs = await db
    .collection<SecretDoc>(COLLECTION)
    .find({ projectId }, { projection: { name: 1, updatedAt: 1 } })
    .sort({ name: 1 })
    .toArray();
  return docs.map((d) => ({ name: d.name, updatedAt: d.updatedAt.toISOString() }));
}

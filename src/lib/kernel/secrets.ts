import crypto from "crypto";
import { getDb } from "./db";

const ALGO = "aes-256-gcm";
const COLLECTION = "secrets";

function getKey(): Buffer {
  const raw = process.env.SECRET_MANAGER_KEY;
  if (!raw) {
    throw new Error(
      "SECRET_MANAGER_KEY env var is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
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
}

export async function setSecret(name: string, value: string): Promise<void> {
  const db = await getDb();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
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
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(doc.iv, "base64"));
  decipher.setAuthTag(Buffer.from(doc.authTag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(doc.value, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}

export async function listSecretNames(): Promise<{ name: string; updatedAt: string }[]> {
  const db = await getDb();
  const docs = await db
    .collection<SecretDoc>(COLLECTION)
    .find({}, { projection: { name: 1, updatedAt: 1 } })
    .sort({ name: 1 })
    .toArray();
  return docs.map((d) => ({ name: d.name, updatedAt: d.updatedAt.toISOString() }));
}

export async function deleteSecret(name: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ name });
}

import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Files live on local disk, not in MongoDB — Mongo only holds metadata (filename, mime type,
 * size, category). Matches the project's "local machine deployment" scope; no S3/blob service
 * to reach for. Directory is configurable via env for the same reason MONGODB_URI is (db.ts).
 */
const VAULT_DIR = process.env.FILE_VAULT_DIR || path.join(process.cwd(), "var", "file-vault");

/** Only ever derives an extension, never a full path — the caller-supplied name never reaches the filesystem directly. */
function safeExt(originalName: string): string {
  const base = originalName.split(/[\\/]/).pop() ?? "";
  const match = /\.[a-zA-Z0-9]{1,10}$/.exec(base);
  return match ? match[0].toLowerCase() : "";
}

/** Returns the generated on-disk key (a fresh UUID, never the original filename) — this is what gets stored on the Mongo doc. */
export async function saveFile(buffer: Buffer, originalName: string): Promise<string> {
  await mkdir(VAULT_DIR, { recursive: true });
  const key = `${crypto.randomUUID()}${safeExt(originalName)}`;
  await writeFile(path.join(VAULT_DIR, key), buffer);
  return key;
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  return readFile(path.join(VAULT_DIR, storageKey));
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  await unlink(path.join(VAULT_DIR, storageKey)).catch(() => {});
}

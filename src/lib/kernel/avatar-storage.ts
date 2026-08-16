import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Profile avatars live on local disk, not in MongoDB — same reasoning and pattern as
 * File Vault's storage.ts, just a separate directory so avatar images (which have no
 * corresponding File Vault Mongo doc) never get mixed in with actual vault uploads.
 */
const AVATAR_DIR = process.env.AVATAR_DIR || path.join(process.cwd(), "var", "avatars");

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function isAllowedAvatarType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_TO_EXT;
}

const EXT_TO_MIME_TYPE: Record<string, string> = Object.fromEntries(Object.entries(ALLOWED_MIME_TO_EXT).map(([mime, ext]) => [ext, mime]));

/** Derives the real Content-Type from the storage key's extension — the key already encodes
 *  it (see saveAvatarFile below), so no separate MIME field needs to be persisted just to
 *  serve it back correctly. Falls back to a generic type rather than the invalid "image/*". */
export function mimeTypeForStorageKey(storageKey: string): string {
  return EXT_TO_MIME_TYPE[path.extname(storageKey)] ?? "application/octet-stream";
}

/** Returns the generated on-disk key (a fresh UUID, never derived from the user) — this is what gets stored on the user's profile. */
export async function saveAvatarFile(buffer: Buffer, mimeType: string): Promise<string> {
  await mkdir(AVATAR_DIR, { recursive: true });
  const key = `${crypto.randomUUID()}${ALLOWED_MIME_TO_EXT[mimeType] ?? ""}`;
  await writeFile(path.join(AVATAR_DIR, key), buffer);
  return key;
}

export async function readAvatarFile(storageKey: string): Promise<Buffer> {
  return readFile(path.join(AVATAR_DIR, storageKey));
}

export async function deleteAvatarFile(storageKey: string): Promise<void> {
  await unlink(path.join(AVATAR_DIR, storageKey)).catch(() => {});
}

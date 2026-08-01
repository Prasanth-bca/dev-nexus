import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";

interface UserDoc {
  email: string;
  passwordHash: string;
}

export async function hasAnyUser(): Promise<boolean> {
  const db = await getDb();
  return (await db.collection("users").countDocuments()) > 0;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const candidate = crypto.scryptSync(password, salt, expected.length);
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

/** Only succeeds once — Dev Nexus is single-admin for now, see ARCHITECTURE.md. */
export async function createAdminUser(email: string, password: string): Promise<string> {
  if (await hasAnyUser()) throw new Error("An admin account already exists.");
  const db = await getDb();
  const result = await db.collection<UserDoc>("users").insertOne({ email, passwordHash: hashPassword(password) });
  return result.insertedId.toString();
}

export async function verifyCredentials(email: string, password: string): Promise<string | null> {
  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ email });
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? user._id.toString() : null;
}

export async function getUserById(userId: string): Promise<{ id: string; email: string } | null> {
  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ _id: new ObjectId(userId) });
  return user ? { id: user._id.toString(), email: user.email } : null;
}

/**
 * Change the admin's own email and/or password. Always requires the current password,
 * even though this is a single-admin instance — it's the only thing stopping someone with
 * a stolen session cookie from locking the real owner out.
 */
export async function updateCredentials(
  userId: string,
  params: { currentPassword: string; newEmail?: string; newPassword?: string }
): Promise<void> {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user) throw new Error("Account not found.");
  if (!verifyPassword(params.currentPassword, user.passwordHash)) {
    throw new Error("Current password is incorrect.");
  }

  const update: Partial<UserDoc> = {};
  if (params.newEmail && params.newEmail !== user.email) update.email = params.newEmail;
  if (params.newPassword) update.passwordHash = hashPassword(params.newPassword);

  if (Object.keys(update).length === 0) return;
  await users.updateOne({ _id: new ObjectId(userId) }, { $set: update });
}

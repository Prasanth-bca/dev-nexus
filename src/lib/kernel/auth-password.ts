import crypto from "crypto";
import { ObjectId, type UpdateFilter } from "mongodb";
import { getDb } from "./db";
import { isDuplicateKeyError } from "./mongo-errors";

export interface UserProfile {
  displayName?: string;
  jobTitle?: string;
  phone?: string;
  bio?: string;
  /** On-disk key (see avatar-storage.ts) — never the original filename. */
  avatarStorageKey?: string;
}

interface UserDoc {
  email: string;
  passwordHash: string;
  profile?: UserProfile;
  /** Always `true` — exists solely so a unique index on it can enforce "at most one
   *  document in this collection," see createAdminUser(). Not a meaningful field on its own. */
  singleton: true;
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

/**
 * Only succeeds once — Dev Nexus is single-admin for now, see ARCHITECTURE.md.
 *
 * The old version (a hasAnyUser() count check, then a separate insertOne) had a real race:
 * two concurrent setup requests — e.g. a double-click on the setup form before it disables —
 * could both pass the count check and each insert their own admin account. A unique index on
 * `singleton` closes that: MongoDB rejects the second insert atomically regardless of timing,
 * since unique-index enforcement (unlike a upsert-on-empty-filter) is safe under concurrency.
 */
export async function createAdminUser(email: string, password: string): Promise<string> {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  // Idempotent and cheap — this only ever runs during the one-time setup flow, so there's no
  // cost to ensuring the index exists on every call rather than requiring a separate migration.
  await users.createIndex({ singleton: 1 }, { unique: true });

  try {
    const result = await users.insertOne({ email, passwordHash: hashPassword(password), singleton: true });
    return result.insertedId.toString();
  } catch (err) {
    if (isDuplicateKeyError(err)) throw new Error("An admin account already exists.");
    throw err;
  }
}

export async function verifyCredentials(email: string, password: string): Promise<string | null> {
  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ email });
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? user._id.toString() : null;
}

export async function getUserById(userId: string): Promise<{ id: string; email: string; profile: UserProfile } | null> {
  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ _id: new ObjectId(userId) });
  return user ? { id: user._id.toString(), email: user.email, profile: user.profile ?? {} } : null;
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

const PROFILE_TEXT_FIELDS = ["displayName", "jobTitle", "phone", "bio"] as const;

/**
 * Updates basic profile fields — unlike updateCredentials(), no current-password check,
 * since none of these are security-sensitive. Each field is three-way: absent from `patch`
 * leaves it untouched, an empty string clears it, a non-empty value sets it (same pattern
 * used for projectId elsewhere in the app).
 */
export async function updateUserProfile(userId: string, patch: Partial<Record<(typeof PROFILE_TEXT_FIELDS)[number], string>>): Promise<UserProfile> {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");

  const set: Record<string, string> = {};
  const unset: Record<string, ""> = {};
  for (const key of PROFILE_TEXT_FIELDS) {
    if (!(key in patch)) continue;
    const value = patch[key]?.trim();
    if (value) set[`profile.${key}`] = value;
    else unset[`profile.${key}`] = "";
  }

  if (Object.keys(set).length || Object.keys(unset).length) {
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) } as UpdateFilter<UserDoc>
    );
  }

  const user = await users.findOne({ _id: new ObjectId(userId) });
  return user?.profile ?? {};
}

export async function setUserAvatarKey(userId: string, storageKey: string): Promise<void> {
  const db = await getDb();
  await db.collection<UserDoc>("users").updateOne({ _id: new ObjectId(userId) }, { $set: { "profile.avatarStorageKey": storageKey } });
}

/** Clears the avatar reference and returns the previous storage key (if any) so the
 *  caller can delete the actual file on disk — this function only touches the DB. */
export async function clearUserAvatarKey(userId: string): Promise<string | undefined> {
  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  const user = await users.findOne({ _id: new ObjectId(userId) });
  const previousKey = user?.profile?.avatarStorageKey;
  await users.updateOne({ _id: new ObjectId(userId) }, { $unset: { "profile.avatarStorageKey": "" } });
  return previousKey;
}

import { getDb } from "./db";

const COLLECTION = "app_setup";

interface SetupStateDoc {
  _id: "setup";
  completed: boolean;
  completedAt?: Date;
  skipped: string[];
}

export interface SetupState {
  completed: boolean;
  completedAt?: string;
  skipped: string[];
}

declare global {
  var _devNexusSetupCompleted: boolean | undefined;
}

/**
 * Drives both the First-Time Setup Wizard's own gate and proxy.ts's dashboard redirect —
 * proxy.ts calls this on every single /dashboard and /setup request, forever, for a value
 * that's permanent once true. Cached on `global` (same pattern as the Mongo client and
 * Gmail's access token) the first time it's observed true, so a completed install skips the
 * Mongo round-trip on every subsequent request; completeSetup()/reopenSetup() keep the cache
 * in sync with the only two places that can change the underlying value.
 *
 * The cached fast path only guarantees `.completed` is accurate (returns `skipped: []` and
 * no `completedAt`) — fine today since neither real caller (proxy.ts, /api/auth/status)
 * reads anything but `.completed`; a future caller needing the other fields should read
 * them via a fresh, uncached query instead of trusting this function's fast path.
 */
export async function getSetupState(): Promise<SetupState> {
  if (global._devNexusSetupCompleted) return { completed: true, skipped: [] };

  const db = await getDb();
  const doc = await db.collection<SetupStateDoc>(COLLECTION).findOne({ _id: "setup" });
  if (!doc) return { completed: false, skipped: [] };
  if (doc.completed) global._devNexusSetupCompleted = true;
  return { completed: doc.completed, completedAt: doc.completedAt?.toISOString(), skipped: doc.skipped ?? [] };
}

export async function completeSetup(skipped: string[]): Promise<void> {
  const db = await getDb();
  await db
    .collection<SetupStateDoc>(COLLECTION)
    .updateOne({ _id: "setup" }, { $set: { completed: true, completedAt: new Date(), skipped } }, { upsert: true });
  global._devNexusSetupCompleted = true;
}

/** Reopens the wizard without touching any existing data or connected integrations —
 *  used by Settings' "Re-run Setup Wizard", distinct from a destructive full reset. */
export async function reopenSetup(): Promise<void> {
  const db = await getDb();
  await db.collection<SetupStateDoc>(COLLECTION).updateOne({ _id: "setup" }, { $set: { completed: false } }, { upsert: true });
  global._devNexusSetupCompleted = false;
}

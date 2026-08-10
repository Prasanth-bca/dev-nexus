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

/** Drives both the First-Time Setup Wizard's own gate and proxy.ts's dashboard redirect. */
export async function getSetupState(): Promise<SetupState> {
  const db = await getDb();
  const doc = await db.collection<SetupStateDoc>(COLLECTION).findOne({ _id: "setup" });
  if (!doc) return { completed: false, skipped: [] };
  return { completed: doc.completed, completedAt: doc.completedAt?.toISOString(), skipped: doc.skipped ?? [] };
}

export async function completeSetup(skipped: string[]): Promise<void> {
  const db = await getDb();
  await db
    .collection<SetupStateDoc>(COLLECTION)
    .updateOne({ _id: "setup" }, { $set: { completed: true, completedAt: new Date(), skipped } }, { upsert: true });
}

/** Reopens the wizard without touching any existing data or connected integrations —
 *  used by Settings' "Re-run Setup Wizard", distinct from a destructive full reset. */
export async function reopenSetup(): Promise<void> {
  const db = await getDb();
  await db.collection<SetupStateDoc>(COLLECTION).updateOne({ _id: "setup" }, { $set: { completed: false } }, { upsert: true });
}

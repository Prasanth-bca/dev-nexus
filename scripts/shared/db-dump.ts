import type { Db, Document } from "mongodb";
import { EJSON } from "bson";

export interface CollectionDump {
  name: string;
  documents: unknown[];
}

/** Dumps every collection in the database to MongoDB's Extended JSON (not plain JSON), so
 *  BSON-specific types (ObjectId, Date, Binary, …) round-trip correctly through a restore
 *  instead of degrading into plain strings/objects. */
export async function dumpDatabase(db: Db): Promise<CollectionDump[]> {
  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const dumps: CollectionDump[] = [];
  for (const { name } of collections) {
    if (name.startsWith("system.")) continue;
    const documents = await db.collection(name).find({}).toArray();
    dumps.push({ name, documents });
  }
  return dumps;
}

export function serializeCollection(documents: unknown[]): string {
  return EJSON.stringify(documents, undefined, 2);
}

export function deserializeCollection(json: string): unknown[] {
  const parsed: unknown = EJSON.parse(json);
  return Array.isArray(parsed) ? parsed : [];
}

/** Restores one collection's documents — clears the target collection first (the backup's
 *  documents fully replace what's there, not merged with it), since leftover live documents
 *  with colliding _ids would otherwise make a partial restore fail unpredictably. */
export async function restoreCollection(db: Db, name: string, documents: unknown[]): Promise<void> {
  const collection = db.collection(name);
  await collection.deleteMany({});
  if (documents.length > 0) await collection.insertMany(documents as Document[]);
}

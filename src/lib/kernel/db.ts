import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "dev_nexus";

declare global {
  var _devNexusMongoClientPromise: Promise<MongoClient> | undefined;
  var _devNexusDbPromise: Promise<Db> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  // Cache on the global object so Next.js dev-mode hot reload doesn't open a new
  // connection pool on every file change.
  if (!global._devNexusMongoClientPromise) {
    global._devNexusMongoClientPromise = new MongoClient(uri).connect();
  }
  return global._devNexusMongoClientPromise;
}

export function getDb(): Promise<Db> {
  if (!global._devNexusDbPromise) {
    global._devNexusDbPromise = getClientPromise().then((client) => client.db(dbName));
  }
  return global._devNexusDbPromise;
}

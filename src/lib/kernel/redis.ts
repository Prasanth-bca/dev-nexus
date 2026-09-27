import { createClient, type RedisClientType } from "redis";

const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";

declare global {
  var _devNexusRedisClientPromise: Promise<RedisClientType> | undefined;
}

function createConnectedClient(): Promise<RedisClientType> {
  const client: RedisClientType = createClient({ url });
  // Swallow connection-level errors here so an unreachable Redis never becomes an
  // unhandled rejection that crashes the process — callers (gmail-cache.ts) already
  // treat a failed getRedis()/command as "no cache" and fall back to the DB.
  client.on("error", (err) => console.error("[redis] client error", err));
  return client.connect().then(() => client);
}

export function getRedis(): Promise<RedisClientType> {
  if (!global._devNexusRedisClientPromise) {
    global._devNexusRedisClientPromise = createConnectedClient().catch((err) => {
      // Reset so the next call retries the connection instead of replaying this rejection forever.
      global._devNexusRedisClientPromise = undefined;
      throw err;
    });
  }
  return global._devNexusRedisClientPromise;
}

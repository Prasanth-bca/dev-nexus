import { getRedis } from "@/lib/kernel/redis";
import { createLogger } from "@/lib/kernel/logger";

const logger = createLogger("gmail-cache");

// Tracks which gmail:list:* keys currently exist so a full-list invalidation (mark-as-read,
// disconnect/reconnect) can delete exactly those keys without a Redis SCAN.
const LIST_KEYS_SET = "gmail:list:keys";

/** Every helper here swallows Redis errors — an unreachable/misconfigured Redis must degrade
 *  to "no cache" (always call through to Mongo/IMAP), never break Gmail. */

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedis();
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    logger.warn("cache read failed, falling back to DB", { key, err: String(err) });
    return null;
  }
}

export async function cacheSetList(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
    await redis.sAdd(LIST_KEYS_SET, key);
  } catch (err) {
    logger.warn("cache write failed", { key, err: String(err) });
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const redis = await getRedis();
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    logger.warn("cache write failed", { key, err: String(err) });
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const redis = await getRedis();
    await redis.del(keys);
  } catch (err) {
    logger.warn("cache invalidation failed", { keys, err: String(err) });
  }
}

/** Clears every currently-tracked list-query cache entry — the Redis equivalent of the old
 *  in-process listCache.clear(), used on mark-as-read and disconnect/reconnect. */
export async function clearListCache(): Promise<void> {
  try {
    const redis = await getRedis();
    const keys = await redis.sMembers(LIST_KEYS_SET);
    if (keys.length > 0) await redis.del(keys);
    await redis.del(LIST_KEYS_SET);
  } catch (err) {
    logger.warn("list cache clear failed", { err: String(err) });
  }
}

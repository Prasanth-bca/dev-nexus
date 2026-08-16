/**
 * A minimal fixed-window lockout for the login route — nothing stood between an attacker and
 * an unlimited number of password guesses against the one account that gates the whole app.
 * In-memory and per-process by design: this is a single-process, locally-run, single-admin
 * app (see ARCHITECTURE.md), so there's no distributed state to coordinate and a server
 * restart clearing the counters is an acceptable trade-off, not a real bypass concern.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function currentBucket(key: string): Bucket {
  const now = Date.now();
  const existing = buckets.get(key);
  if (existing && existing.resetAt > now) return existing;
  const fresh: Bucket = { count: 0, resetAt: now + WINDOW_MS };
  buckets.set(key, fresh);
  return fresh;
}

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const bucket = currentBucket(key);
  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000)) };
  }
  return { allowed: true };
}

export function recordFailedLogin(key: string): void {
  currentBucket(key).count += 1;
}

export function clearLoginAttempts(key: string): void {
  buckets.delete(key);
}

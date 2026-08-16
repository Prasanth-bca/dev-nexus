import { getSessionSecretBase64 } from "./instance-keys";

/**
 * Session token signing/verification — deliberately built on Web Crypto (globalThis.crypto.subtle)
 * instead of Node's `crypto` module, because this is imported by proxy.ts (formerly middleware.ts),
 * which can run in the Edge runtime and can't use Node built-ins. Password hashing (which needs
 * real Node crypto) lives in auth-password.ts instead, imported only by route handlers that run in
 * the Node runtime.
 */

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export const SESSION_COOKIE_NAME = "dev_nexus_session";
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

/**
 * Whether to mark the session cookie `Secure` — never hardcoded true, since this app is
 * primarily run locally over plain HTTP (localhost, or a LAN IP), where a Secure cookie
 * would silently fail to be set at all and break login entirely. Checks the request's own
 * protocol for a direct HTTPS connection, and falls back to `x-forwarded-proto` for the case
 * where TLS is terminated by a reverse proxy in front of the Node process.
 */
export function isSecureRequest(req: Request): boolean {
  if (new URL(req.url).protocol === "https:") return true;
  return req.headers.get("x-forwarded-proto") === "https";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const raw = await getSessionSecretBase64();
  return crypto.subtle.importKey("raw", base64Decode(raw) as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSessionToken(userId: string): Promise<string> {
  const payload = JSON.stringify({ sub: userId, exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  const key = await getHmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${base64UrlEncode(new Uint8Array(sig))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const key = await getHmacKey();
  const valid = await crypto.subtle.verify("HMAC", key, base64UrlDecode(sigB64) as BufferSource, new TextEncoder().encode(payloadB64));
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

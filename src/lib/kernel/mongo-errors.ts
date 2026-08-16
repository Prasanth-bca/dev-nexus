/** True for a MongoDB duplicate-key error (E11000) — the signal that a unique/partial-unique
 *  index just rejected a write because another document already holds the constrained value. */
export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 11000;
}

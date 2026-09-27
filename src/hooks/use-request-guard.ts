import { useCallback, useRef } from "react";

/**
 * Guards a component against a slower, older async response landing after — and overwriting
 * the result of — a newer one. Call `start()` when kicking off a request to get a token, then
 * only apply the result if `isCurrent(token)` still holds true when it resolves.
 *
 * Example:
 *   const guard = useRequestGuard();
 *   const token = guard.start();
 *   fetch(url).then((data) => { if (guard.isCurrent(token)) setState(data); });
 *
 * Deliberately a token counter, not an AbortController — most call sites here just need to
 * ignore a stale response, not actually cancel the in-flight request.
 */
export function useRequestGuard() {
  const tokenRef = useRef(0);
  const start = useCallback(() => ++tokenRef.current, []);
  const isCurrent = useCallback((token: number) => token === tokenRef.current, []);
  // start/isCurrent are stable (empty deps), but returning a fresh object literal every render
  // still breaks any useCallback that lists this hook's return value as a dependency — that
  // callback's identity changes every render too, which can refire an effect that depends on
  // it in an infinite loop (RepoDetail's branches/commits/pulls/issues fetch did exactly this).
  const guardRef = useRef({ start, isCurrent });
  return guardRef.current;
}

"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * A slim, fixed banner shown app-wide (mounted in the root layout, so it covers
 * /login and /setup too, not just the dashboard) whenever the browser goes offline.
 *
 * Always starts "online" on both server and client, rather than lazy-initializing from
 * navigator.onLine — Node 21+ ships a partial global `navigator` with no `onLine`
 * property, so `typeof navigator === "undefined"` is false during SSR while
 * `navigator.onLine` is also undefined there, making the server render the banner
 * while a genuinely-online browser doesn't. That mismatch was caught live via a real
 * hydration error. Starting both sides at "online" keeps the first render identical;
 * the effect below corrects it to the real value immediately after mount.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Deferred like every other mount-time setState in this app (see ActivityView.tsx/
    // RepoDetail.tsx) — satisfies react-hooks/set-state-in-effect.
    const timeout = setTimeout(() => setOnline(navigator.onLine), 0);

    function goOnline() {
      setOnline(true);
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-center text-sm font-medium text-destructive backdrop-blur-sm dark:bg-destructive/15"
    >
      <WifiOff aria-hidden className="h-4 w-4 shrink-0" />
      You&apos;re offline — some features may not work until your connection is restored.
    </div>
  );
}

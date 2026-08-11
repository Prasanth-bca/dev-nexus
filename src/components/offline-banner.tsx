"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * A slim, fixed banner shown app-wide (mounted in the root layout, so it covers
 * /login and /setup too, not just the dashboard) whenever the browser goes offline.
 * Lazy-initialized from navigator.onLine rather than defaulting to "online" and
 * correcting in an effect, so a page loaded while already offline doesn't flash
 * as online for a moment first.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);

  useEffect(() => {
    function goOnline() {
      setOnline(true);
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
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

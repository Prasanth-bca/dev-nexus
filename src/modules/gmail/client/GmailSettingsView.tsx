"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function GmailSettings({
  initialConfigured,
  initialConnected,
  redirectUri,
}: {
  initialConfigured: boolean;
  initialConnected: boolean;
  redirectUri: string;
}) {
  const searchParams = useSearchParams();
  const [configured, setConfigured] = useState(initialConfigured);
  // Lazily fold the OAuth redirect's ?status=connected/error into initial state instead of
  // syncing it via an effect — searchParams is already correct on first render (this route is
  // always dynamically rendered, never statically optimized, since it sits behind the auth gate).
  const [connected, setConnected] = useState(() => initialConnected || searchParams.get("status") === "connected");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const status = searchParams.get("status");
    const message = searchParams.get("message");
    return status === "error" && message ? message : null;
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSaveCredentials(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/modules/gmail/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save credentials.");
        return;
      }
      setConfigured(true);
      setClientId("");
      setClientSecret("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Gmail? You'll need to reconnect to use it again.")) return;
    await fetch("/api/modules/gmail/disconnect", { method: "POST" });
    setConnected(false);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold mb-1">Gmail</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Connects via Google OAuth so the AI Assistant can later list unread email and manage labels. This page only sets up the
        connection — nothing is read yet.
      </p>

      <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-4 mb-6">
        <p className="text-sm font-medium mb-2">1. Create OAuth credentials in Google Cloud Console</p>
        <ol className="text-sm text-zinc-500 dark:text-zinc-400 list-decimal list-inside flex flex-col gap-1 mb-3">
          <li>Create (or reuse) a project at console.cloud.google.com.</li>
          <li>Enable the &quot;Gmail API&quot; for that project.</li>
          <li>Configure the OAuth consent screen (&quot;External&quot; is fine for personal use).</li>
          <li>Create credentials → OAuth client ID → type &quot;Web application&quot; → add this exact Authorized redirect URI:</li>
        </ol>
        <code className="block text-xs bg-zinc-100 dark:bg-zinc-900 rounded px-2 py-1.5 mb-3 break-all">{redirectUri}</code>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Then copy the generated Client ID and Client Secret below.</p>
      </div>

      <form
        onSubmit={handleSaveCredentials}
        className="flex flex-col gap-2 mb-6 border border-zinc-200 dark:border-zinc-800 rounded-md p-3"
      >
        <p className="text-sm font-medium">2. Save your credentials</p>
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Client ID"
          autoComplete="off"
          className="text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 outline-none focus:border-zinc-400"
        />
        <input
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="Client Secret"
          className="text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 outline-none focus:border-zinc-400"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !clientId || !clientSecret}
          className="text-sm rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium py-2 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save credentials"}
        </button>
      </form>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-md p-4">
        <p className="text-sm font-medium mb-2">3. Connect your Google account</p>
        {connected ? (
          <div className="flex items-center justify-between">
            <span className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Connected
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/api/modules/gmail/oauth/start"
                title="Re-run the consent flow — needed after new permissions (e.g. sending) are added"
                className="text-xs px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800"
              >
                Reconnect
              </Link>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 dark:border-red-900"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : configured ? (
          <Link
            href="/api/modules/gmail/oauth/start"
            className="inline-block text-sm px-4 py-2 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Connect Google Account
          </Link>
        ) : (
          <p className="text-sm text-zinc-400">Save your Client ID and Secret above first.</p>
        )}
      </div>
    </div>
  );
}

export function GmailSettingsView(props: { initialConfigured: boolean; initialConnected: boolean; redirectUri: string }) {
  return (
    <Suspense fallback={null}>
      <GmailSettings {...props} />
    </Suspense>
  );
}

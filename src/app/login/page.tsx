"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [hasUser, setHasUser] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => setHasUser(Boolean(data.hasUser)))
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasUser && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(hasUser ? "/api/auth/login" : "/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push(searchParams.get("from") || "/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h1 className="text-lg font-semibold mb-1">{hasUser ? "Log in to Dev Nexus" : "Create your admin account"}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
          {hasUser ? "One Platform. Complete Developer Control." : "Dev Nexus is single-admin — this is the only account you'll set up."}
        </p>

        <div className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoFocus
            className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          <input
            type="password"
            required
            minLength={hasUser ? undefined : 8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
          {!hasUser && (
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400"
            />
          )}
        </div>

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-medium py-2 disabled:opacity-50"
        >
          {submitting ? "Please wait…" : hasUser ? "Log In" : "Create Account"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/** Matches the real card's silhouette so the swap into the form doesn't shift layout. */
function FormSkeleton() {
  return (
    <div className="glass flex flex-col gap-6 rounded-xl p-6 sm:p-8">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

export function LoginForm() {
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

  // Which copy to show depends on whether an admin already exists, so hold the
  // card's shape until /api/auth/status answers rather than flashing the wrong title.
  if (checking) return <FormSkeleton />;

  return (
    <form onSubmit={handleSubmit} className="glass animate-fade-in-up flex flex-col gap-6 rounded-xl p-6 sm:p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Product mark — same gradient tile as the sidebar so the app is
            recognisable before the shell has ever rendered. */}
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-lg font-bold text-white shadow-[0_6px_20px_color-mix(in_srgb,var(--primary)_40%,transparent)]">
          N
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-semibold tracking-tight">{hasUser ? "Log in to Dev Nexus" : "Create your admin account"}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {hasUser
              ? "One Platform. Complete Developer Control."
              : "Dev Nexus is single-admin — this is the only account you'll set up."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="login-password">Password</Label>
          <div className="relative">
            <Lock aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-password"
              type="password"
              required
              minLength={hasUser ? undefined : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={hasUser ? "••••••••" : "At least 8 characters"}
              className="h-11 pl-9"
            />
          </div>
        </div>

        {!hasUser && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-confirm-password">Confirm password</Label>
            <div className="relative">
              <ShieldCheck aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="h-11 pl-9"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="animate-fade-in flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="h-11 w-full">
        {submitting ? "Please wait…" : hasUser ? "Log In" : "Create Account"}
      </Button>
    </form>
  );
}

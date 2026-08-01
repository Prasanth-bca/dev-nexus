"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountForm({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newEmail: email !== currentEmail ? email : undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Update failed.");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail aria-hidden className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
          <CardDescription>The address you sign in with.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="account-email">Email</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock aria-hidden className="h-4 w-4 text-muted-foreground" />
            Password
          </CardTitle>
          <CardDescription>Leave blank to keep your current password.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="account-new-password">New password</Label>
              <Input
                id="account-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                placeholder="At least 8 characters"
                className="h-10"
              />
            </div>

            {newPassword && (
              <div className="animate-fade-in flex flex-col gap-2">
                <Label htmlFor="account-confirm-password">Confirm new password</Label>
                <Input
                  id="account-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="h-10"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="h-4 w-4 text-muted-foreground" />
            Confirm it&apos;s you
          </CardTitle>
          <CardDescription>Your current password is required to save any change.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="account-current-password">Current password</Label>
            <Input
              id="account-current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p
          role="alert"
          className="animate-fade-in flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="animate-fade-in flex items-start gap-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-xs text-success"
        >
          <CheckCircle2 aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
          Saved.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} className="h-10 px-5">
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

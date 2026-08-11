"use client";

import { useRef, useState } from "react";
import { AlertCircle, Briefcase, Camera, CheckCircle2, Loader2, Phone, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { UserProfile } from "@/lib/kernel/auth-password";

const MAX_BIO_LENGTH = 500;

export function ProfileForm({ initialProfile, hasAvatar }: { initialProfile: UserProfile; hasAvatar: boolean }) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName ?? "");
  const [jobTitle, setJobTitle] = useState(initialProfile.jobTitle ?? "");
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [avatarPresent, setAvatarPresent] = useState(hasAvatar);
  const [avatarNonce, setAvatarNonce] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = (displayName || "?").trim().charAt(0).toUpperCase();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, jobTitle, phone, bio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save profile.");
        return;
      }
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/auth/profile/avatar", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not upload avatar.");
        return;
      }
      setAvatarPresent(true);
      setAvatarNonce((n) => n + 1);
      toast.success("Avatar updated.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    await fetch("/api/auth/profile/avatar", { method: "DELETE" });
    setAvatarPresent(false);
    toast.success("Avatar removed.");
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User aria-hidden className="h-4 w-4 text-muted-foreground" />
            Profile
          </CardTitle>
          <CardDescription>Shown alongside your account — not required, purely informational.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-foreground/[0.04] dark:bg-white/[0.05]">
              {avatarPresent ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic, auth-gated API content
                <img
                  key={avatarNonce}
                  src={`/api/auth/profile/avatar?v=${avatarNonce}`}
                  alt="Your avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">{initials}</span>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                {avatarPresent ? "Change" : "Upload"}
              </Button>
              {avatarPresent && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoveDialogOpen(true)}
                  className="gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarChange}
                className="sr-only"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-display-name">Display name</Label>
              <Input id="profile-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-10" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-job-title" className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                Job title
              </Label>
              <Input id="profile-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="h-10" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Phone
            </Label>
            <Input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              placeholder="A short line about yourself…"
              className="min-h-20"
            />
            <span className="self-end text-xs text-muted-foreground">
              {bio.length}/{MAX_BIO_LENGTH}
            </span>
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
        <Button type="submit" disabled={saving} className="h-10 px-5">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remove your avatar?"
        description="This deletes the image from disk. You can upload a new one anytime."
        confirmLabel="Remove"
        destructive
        onConfirm={handleRemoveAvatar}
      />
    </form>
  );
}

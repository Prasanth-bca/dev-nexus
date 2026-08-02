import { Building2, Lock, LockOpen, ShieldCheck, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RepoPermission, RepoRelationship } from "./types";

/**
 * Explains, in plain language, why a given repo shows up at all — this is the direct
 * answer to "why do I see private/collaborative repos" surfaced per-row instead of
 * buried in documentation. Native `title` tooltips, not the JS Tooltip primitive: a
 * repo list can be 100 rows long, and mounting a full interactive tooltip per badge is
 * unnecessary weight for what's fundamentally static explanatory text.
 */
const RELATIONSHIP_META: Record<RepoRelationship, { label: string; icon: LucideIcon; tooltip: (owner: string) => string }> = {
  owner: { label: "Owner", icon: User, tooltip: () => "You own this repository." },
  collaborator: {
    label: "Collaborator",
    icon: ShieldCheck,
    tooltip: (owner) => `You were added as a collaborator on ${owner}'s repository.`,
  },
  organization: {
    label: "Organization",
    icon: Building2,
    tooltip: (owner) => `This repository belongs to the ${owner} organization, which you're a member of.`,
  },
};

const PERMISSION_LABEL: Record<NonNullable<RepoPermission>, string> = {
  admin: "Admin",
  maintain: "Maintain",
  write: "Write",
  triage: "Triage",
  read: "Read",
};

const BADGE = "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-medium";

export function VisibilityBadge({ isPrivate, compact }: { isPrivate: boolean; compact?: boolean }) {
  const Icon = isPrivate ? Lock : LockOpen;
  return (
    <span
      title={isPrivate ? "Private — only visible to you and people explicitly granted access." : "Public — visible to anyone on GitHub."}
      className={cn(
        BADGE,
        compact ? "text-[10px]" : "text-[11px]",
        isPrivate
          ? "border-[color-mix(in_srgb,var(--warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-[var(--warning)]"
          : "border-border bg-foreground/[0.04] text-muted-foreground dark:bg-white/[0.05]"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {isPrivate ? "Private" : "Public"}
    </span>
  );
}

export function RelationshipBadge({
  relationship,
  ownerLogin,
  compact,
}: {
  relationship: RepoRelationship;
  ownerLogin: string;
  compact?: boolean;
}) {
  const meta = RELATIONSHIP_META[relationship];
  return (
    <span
      title={meta.tooltip(ownerLogin)}
      className={cn(
        BADGE,
        compact ? "text-[10px]" : "text-[11px]",
        "border-[color-mix(in_srgb,var(--module-github)_22%,transparent)] bg-[color-mix(in_srgb,var(--module-github)_10%,transparent)] text-[var(--module-github)]"
      )}
    >
      <meta.icon className="h-3 w-3" aria-hidden />
      {meta.label}
    </span>
  );
}

export function PermissionBadge({ permission }: { permission: RepoPermission }) {
  if (!permission) return null;
  return (
    <span
      title={`Your access level on this repository: ${PERMISSION_LABEL[permission]}.`}
      className={cn(BADGE, "border-border bg-foreground/[0.04] text-[11px] text-muted-foreground dark:bg-white/[0.06]")}
    >
      {PERMISSION_LABEL[permission]} access
    </span>
  );
}

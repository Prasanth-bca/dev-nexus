import type { ReactNode } from "react";
import { getModulesOnce, type NavLink } from "./dashboard-data";
import { DashboardShell } from "./DashboardShell";
import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { getUserById } from "@/lib/kernel/auth-password";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // getModulesOnce (not the raw getModules()) so this shares its one-per-request cache
  // with the page/route inside {children} — see the comment on getModulesOnce itself.
  const loaded = await getModulesOnce();

  const moduleLinks: NavLink[] = loaded
    .filter((m) => m.enabled && m.module.manifest.navEntry)
    .map((m) => ({
      label: m.module.manifest.navEntry!.label,
      path: m.module.manifest.navEntry!.path,
      iconName: m.module.manifest.icon,
      moduleId: m.module.manifest.id,
      description: m.module.manifest.description,
    }));

  // Cheap enough (one indexed lookup) to fetch unconditionally for the header's profile
  // chip — layout.tsx already sits behind the auth check every /dashboard/* page relies on.
  const userId = await getCurrentUserId();
  const user = userId ? await getUserById(userId) : null;
  const profile = {
    displayName: user?.profile.displayName || user?.email.split("@")[0] || "Account",
    hasAvatar: Boolean(user?.profile.avatarStorageKey),
  };

  return (
    <DashboardShell moduleLinks={moduleLinks} profile={profile}>
      {children}
    </DashboardShell>
  );
}

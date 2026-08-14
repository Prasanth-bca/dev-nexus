import { cache } from "react";
import { getModules } from "@/modules/loaded";
import { listSecretNames } from "@/lib/kernel/secrets";
import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { getUserById } from "@/lib/kernel/auth-password";
import type { DashboardWidget } from "@/lib/kernel/types";

/** Serializable only — icon *names* and module ids cross the server/client boundary,
 *  never the Lucide components themselves (functions can't be passed as props). */
export interface NavLink {
  label: string;
  path: string;
  iconName?: string;
  moduleId: string;
  /** One-sentence summary from the module's manifest — used by the Apps Launcher tile tooltip. */
  description?: string;
}

/**
 * getLoadedModules() reruns the ENTIRE module pipeline on every call in dev mode — see
 * loader.ts — rebuilding every module's context and re-running onEnable. Calling
 * getModules() once per widget instead of once per request would multiply that cost by
 * the module count on every Dashboard load. cache() pins it to one call per request no
 * matter how many components ask for it — and since cache() dedupes by function identity,
 * every /dashboard/* page and the layout that wraps them all must import THIS wrapper
 * (not the raw getModules()) for that sharing to actually happen across the request.
 */
export const getModulesOnce = cache(getModules);

export interface ModuleWidgetData {
  moduleId: string;
  title: string;
  iconName?: string;
  widget: DashboardWidget;
}

/**
 * One module's widget() data, memoized per request via cache(). The hero stat row and
 * the grid card for the same module both read this — without memoizing, that would be
 * two separate slow API calls (e.g. Gmail, GitHub) for what is really one fetch.
 */
export const getModuleWidgetData = cache(async (moduleId: string): Promise<ModuleWidgetData | null> => {
  const loaded = await getModulesOnce();
  const found = loaded.find((m) => m.module.manifest.id === moduleId);
  if (!found || !found.enabled || !found.module.widget || !found.ctx) return null;
  try {
    const widget = await found.module.widget(found.ctx);
    return { moduleId, title: found.module.manifest.name, iconName: found.module.manifest.icon, widget };
  } catch {
    // A module's widget failing (e.g. an integration that's down) shouldn't blank the whole dashboard.
    return null;
  }
});

export const getEnabledModuleCount = cache(async (): Promise<number> => {
  const loaded = await getModulesOnce();
  return loaded.filter((m) => m.enabled).length;
});

export const getSecretCount = cache(async (): Promise<number> => {
  const names = await listSecretNames();
  return names.length;
});

/** Reads the module's own already-fetched stat rather than triggering a second fetch. */
export async function getModuleStatValue(moduleId: string): Promise<number> {
  const data = await getModuleWidgetData(moduleId);
  const value = data?.widget.stat?.value;
  return typeof value === "number" ? value : Number(value) || 0;
}

/**
 * First name for the hero greeting. Prefers the profile's display name (Settings → Profile)
 * so editing it there is reflected here immediately; falls back to a name derived from the
 * account email — e.g. "prasanth.e390@gmail.com" greets "Prasanth" — only when no display
 * name has been set.
 */
export const getGreetingName = cache(async (): Promise<string> => {
  const userId = await getCurrentUserId();
  if (!userId) return "there";
  const user = await getUserById(userId);
  const displayName = user?.profile.displayName?.trim();
  if (displayName) return displayName.split(/\s+/)[0];

  const local = user?.email?.split("@")[0] ?? "";
  const name = /^[a-z]+/i.exec(local)?.[0];
  if (!name) return "there";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
});

export function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}

import type { ReactNode } from "react";
import { getModules } from "@/modules/loaded";
import { Sidebar, type NavLink } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const loaded = await getModules();

  const moduleLinks: NavLink[] = loaded
    .filter((m) => m.enabled && m.module.manifest.navEntry)
    .map((m) => ({
      label: m.module.manifest.navEntry!.label,
      path: m.module.manifest.navEntry!.path,
      iconName: m.module.manifest.icon,
      moduleId: m.module.manifest.id,
    }));

  return (
    // h-dvh + overflow-hidden (not min-h-screen) is what makes `main` a real bounded
    // box. With only min-h-screen, nothing below ever has a real height to fill —
    // "h-full"/"flex-1" chains inside split-pane pages (Gmail, Notes) resolved to
    // "auto" and grew the whole page instead of scrolling internally, which is why
    // long emails/notes pushed the entire window taller rather than scrolling in place.
    <div className="flex h-dvh overflow-hidden">
      <Sidebar moduleLinks={moduleLinks} />

      {/* The one scroll container for the whole shell. Pages taller than the viewport
          (Dashboard, Settings, About) scroll here normally. Split-pane pages (Gmail,
          Notes) fill this box exactly via h-full and manage their own internal
          scrolling, so main's own scrollbar never engages for them.
          pb-20 on mobile clears the fixed bottom nav; min-w-0 stops wide children
          (tables, code blocks) from forcing the shell to scroll sideways. */}
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pt-4 pb-20 md:px-6 md:pt-6 md:pb-6">{children}</main>

      <MobileNav moduleLinks={moduleLinks} />
    </div>
  );
}

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
    <div className="flex min-h-screen">
      <Sidebar moduleLinks={moduleLinks} />

      {/* pb-20 on mobile clears the fixed bottom nav; min-w-0 stops wide children
          (tables, code blocks) from forcing the whole shell to scroll sideways. */}
      <main className="min-w-0 flex-1 px-4 pt-4 pb-20 md:px-6 md:pt-6 md:pb-6">{children}</main>

      <MobileNav moduleLinks={moduleLinks} />
    </div>
  );
}

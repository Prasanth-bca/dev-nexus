"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Info, KeyRound, LayoutGrid, LogOut, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModuleAccent, getModuleIcon } from "@/lib/icon-map";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/command-palette";

/** Serializable only — icon *names* and module ids cross the server/client boundary,
 *  never the Lucide components themselves (functions can't be passed as props). */
export interface NavLink {
  label: string;
  path: string;
  iconName?: string;
  moduleId: string;
}

interface SidebarProps {
  moduleLinks: NavLink[];
}

const CORE_LINKS: { label: string; path: string; icon: LucideIcon; accent: string }[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutGrid, accent: "var(--primary)" },
  { label: "Secrets", path: "/dashboard/secrets", icon: KeyRound, accent: "var(--module-secrets)" },
  { label: "Settings", path: "/dashboard/settings", icon: Settings, accent: "var(--muted-foreground)" },
  { label: "About", path: "/dashboard/about", icon: Info, accent: "var(--muted-foreground)" },
];

function NavItem({
  label,
  path,
  icon: Icon,
  accent,
  active,
  collapsed,
}: {
  label: string;
  path: string;
  icon: LucideIcon;
  accent: string;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={path}
      aria-current={active ? "page" : undefined}
      style={{ "--accent": accent } as React.CSSProperties}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-200",
        collapsed && "justify-center px-0",
        active
          ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium text-foreground"
          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]"
      )}
    >
      {/* Active indicator — a pill on the left edge that scales in rather than
          appearing abruptly. Absolutely positioned so it never shifts layout. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)] transition-transform duration-200",
          active ? "scale-y-100" : "scale-y-0"
        )}
      />
      <Icon
        className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-[var(--accent)]" : "group-hover:text-foreground")}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ moduleLinks }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => (path === "/dashboard" ? pathname === path : pathname.startsWith(path));

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "glass sticky top-3 z-30 ml-3 hidden h-[calc(100vh-1.5rem)] shrink-0 flex-col gap-4 rounded-xl p-3 transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-[232px]"
      )}
    >
      <div className={cn("flex items-center gap-2", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 px-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-[13px] font-bold text-white">
              N
            </span>
            <span className="text-sm font-semibold tracking-tight">Dev Nexus</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.06]"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
        </button>
      </div>

      <CommandPalette collapsed={collapsed} />

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {CORE_LINKS.map((item) => (
          <NavItem key={item.path} {...item} active={isActive(item.path)} collapsed={collapsed} />
        ))}

        {moduleLinks.length > 0 && (
          <>
            <div className={cn("mt-4 mb-1 px-2.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase", collapsed && "sr-only")}>
              Modules
            </div>
            {moduleLinks.map((item) => (
              <NavItem
                key={item.path}
                label={item.label}
                path={item.path}
                icon={getModuleIcon(item.iconName)}
                accent={getModuleAccent(item.moduleId)}
                active={isActive(item.path)}
                collapsed={collapsed}
              />
            ))}
          </>
        )}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
          collapsed && "justify-center px-0"
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!collapsed && "Log out"}
      </button>
    </aside>
  );
}

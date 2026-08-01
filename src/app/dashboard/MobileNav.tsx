"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModuleAccent, getModuleIcon } from "@/lib/icon-map";
import type { NavLink } from "./Sidebar";

/**
 * Bottom navigation for small screens — the sidebar is hidden below `md`.
 * Capped at 5 destinations (Dashboard + first four modules) so targets stay
 * comfortably large; everything else stays reachable via the command palette.
 */
export function MobileNav({ moduleLinks }: { moduleLinks: NavLink[] }) {
  const pathname = usePathname();
  const items = [{ label: "Home", path: "/dashboard", iconName: undefined, moduleId: "dashboard" }, ...moduleLinks].slice(0, 5);

  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around rounded-t-xl px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">
      {items.map((item) => {
        const active = item.path === "/dashboard" ? pathname === item.path : pathname.startsWith(item.path);
        const Icon = item.moduleId === "dashboard" ? LayoutGrid : getModuleIcon(item.iconName);
        const accent = item.moduleId === "dashboard" ? "var(--primary)" : getModuleAccent(item.moduleId);

        return (
          <Link
            key={item.path}
            href={item.path}
            aria-current={active ? "page" : undefined}
            style={{ "--accent": accent } as React.CSSProperties}
            className={cn(
              "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[10px] transition-colors",
              active ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] transition-colors", active && "text-[var(--accent)]")} />
            <span className="truncate px-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

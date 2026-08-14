"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { getModuleAccent, getModuleIcon } from "@/lib/icon-map";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { NavLink } from "./dashboard-data";

const ABOUT_TILE: NavLink = {
  moduleId: "about",
  label: "About",
  path: "/dashboard/about",
  iconName: "Info",
  description: "What Dev Nexus is and how it works",
};

/**
 * The 9-dot "Apps" launcher — the homepage's replacement for the permanent sidebar as a way
 * to reach every module. Built on the existing DropdownMenu (base-ui Menu) primitive rather
 * than a bespoke popover, so Escape/click-outside/focus-trap all come for free; only the
 * panel's inner layout (a grid instead of a list) is custom.
 */
export function AppsLauncher({ apps }: { apps: NavLink[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open apps launcher"
        title="Apps"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground data-popup-open:bg-foreground/[0.06] data-popup-open:text-foreground dark:hover:bg-white/[0.06]"
      >
        <LayoutGrid className="h-[18px] w-[18px]" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[380px] max-w-[90vw] animate-scale-in origin-top-right p-3"
      >
        <div className="mb-2 px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Apps</div>
        <div className="grid grid-cols-3 gap-1">
          {[...apps, ABOUT_TILE].map((app) => {
            const Icon = getModuleIcon(app.iconName);
            const accent = getModuleAccent(app.moduleId);
            return (
              <Link
                key={app.moduleId}
                href={app.path}
                title={app.description}
                style={{ "--accent": accent } as React.CSSProperties}
                className="group flex flex-col items-center gap-1.5 rounded-lg p-2.5 text-center transition-colors hover:bg-foreground/[0.05] dark:hover:bg-white/[0.06]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] transition-transform duration-200 group-hover:scale-105">
                  <Icon className="h-4 w-4 text-[var(--accent)]" />
                </span>
                <span className="line-clamp-1 text-xs font-medium">{app.label}</span>
              </Link>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

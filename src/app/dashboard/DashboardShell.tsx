"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavLink } from "./dashboard-data";
import { HomeHeader } from "./HomeHeader";

interface DashboardShellProps {
  moduleLinks: NavLink[];
  profile: { displayName: string; hasAvatar: boolean };
  children: ReactNode;
}

/**
 * The whole-app shell: a static top bar (HomeHeader) plus one scrollable content area,
 * used on every `/dashboard/*` route — there is no permanent side navigation anywhere in
 * the app anymore. h-dvh + overflow-hidden on the outer column is what makes `main` a real
 * bounded box; split-pane pages (Gmail, Notes) still fill it via h-full and manage their
 * own internal scrolling, exactly as when the sidebar sat to the side instead of the header
 * sitting on top.
 *
 * The homepage (`/dashboard` exactly) gets no extra padding here — HeroSection and the
 * sections below it each manage their own spacing — everything else gets standard content
 * padding, matching what the old sidebar layout gave every page.
 */
export function DashboardShell({ moduleLinks, profile, children }: DashboardShellProps) {
  const pathname = usePathname();
  const isHome = pathname === "/dashboard";

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <HomeHeader moduleLinks={moduleLinks} profile={profile} />
      <main className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto", !isHome && "px-4 pt-2 pb-6 md:px-6 md:pt-3")}>{children}</main>
    </div>
  );
}

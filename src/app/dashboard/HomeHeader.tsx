"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { History, Info, KeyRound, LogOut, Settings } from "lucide-react";
import { AppsLauncher } from "./AppsLauncher";
import type { NavLink } from "./dashboard-data";
import { CommandPalette } from "@/components/command-palette";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface HomeHeaderProps {
  moduleLinks: NavLink[];
  profile: { displayName: string; hasAvatar: boolean };
}

/**
 * The static top nav rendered on every `/dashboard/*` route — replaces the old permanent
 * left sidebar entirely. All navigation (between modules, to Settings/Secrets/About, log
 * out) happens through the Apps Launcher and profile menu here, not a side panel.
 */
export function HomeHeader({ moduleLinks, profile }: HomeHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initial = (profile.displayName || "A").charAt(0).toUpperCase();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-6">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-sm font-bold text-white">
          N
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Dev Nexus</span>
      </Link>

      <div className="flex items-center gap-1">
        {/* HeroSection already renders the big hero search on the homepage — mounting a
            second CommandPalette instance there would double-register the Ctrl+K listener
            and fight over which dialog opens. Every other route has no hero, so it needs
            this compact trigger to keep search (and Ctrl+K) reachable at all. */}
        {pathname !== "/dashboard" && <CommandPalette variant="icon" />}

        <AppsLauncher apps={moduleLinks} />

        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/dashboard/activity"
                aria-label="Activity"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground dark:hover:bg-white/[0.06]"
              >
                <History className="h-[18px] w-[18px]" />
              </Link>
            }
          />
          <TooltipContent side="bottom">Activity</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border text-xs font-semibold transition-colors hover:border-[var(--primary)] data-popup-open:border-[var(--primary)]"
          >
            {profile.hasAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar is served from our own API, not next/image-optimizable remote storage
              <img src="/api/auth/profile/avatar" alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-foreground/[0.06] dark:bg-white/[0.08]">{initial}</span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={10} className="w-52 animate-scale-in origin-top-right">
            <div className="truncate px-1.5 py-1.5 text-sm font-medium">{profile.displayName}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <Settings className="h-3.5 w-3.5" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/secrets" />}>
              <KeyRound className="h-3.5 w-3.5" />
              Secret Manager
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/about" />}>
              <Info className="h-3.5 w-3.5" />
              About
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

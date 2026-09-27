import { Suspense } from "react";
import { FolderGit2, KeyRound, LayoutGrid, Mail, Vault } from "lucide-react";
import { getEnabledModuleCount, getGmailUnreadToday, getModuleStatValue, getSecretCount } from "./dashboard-data";
import { HeroStat, HeroStatSkeleton } from "./HeroStat";

/**
 * The same stat row the old dashboard put front-and-center in the hero — demoted here to a
 * quiet strip below the workspace grid, per the redesign spec's "statistics are not the
 * first thing you see" rule. Same data, same HeroStat component, just relocated and smaller.
 */
export function WorkspaceOverview() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <h2 className="mb-3 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Workspace Overview</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Suspense fallback={<HeroStatSkeleton />}>
          <HeroStat label="Modules Active" icon={LayoutGrid} accent="var(--primary)" load={getEnabledModuleCount} />
        </Suspense>
        <Suspense fallback={<HeroStatSkeleton />}>
          <HeroStat label="Unread today" icon={Mail} accent="var(--module-gmail)" load={getGmailUnreadToday} />
        </Suspense>
        <Suspense fallback={<HeroStatSkeleton />}>
          <HeroStat label="Repos" icon={FolderGit2} accent="var(--module-github)" load={() => getModuleStatValue("github")} />
        </Suspense>
        <Suspense fallback={<HeroStatSkeleton />}>
          <HeroStat label="Secrets" icon={KeyRound} accent="var(--module-secrets)" load={getSecretCount} />
        </Suspense>
        <Suspense fallback={<HeroStatSkeleton />}>
          <HeroStat label="Files" icon={Vault} accent="var(--module-vault)" load={() => getModuleStatValue("file-vault")} />
        </Suspense>
      </div>
    </section>
  );
}

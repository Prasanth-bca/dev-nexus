import { Suspense } from "react";
import { HeroSection } from "./HeroSection";
import { ContinueWorking } from "./ContinueWorking";
import { WorkspaceSection } from "./WorkspaceSection";
import { WorkspaceOverview } from "./WorkspaceOverview";
import { RecentActivity, RecentActivitySkeleton } from "./RecentActivity";
import { DashboardFooter } from "./DashboardFooter";

/**
 * The redesigned `/dashboard` homepage — search-first hero, then Continue Working, Your
 * Workspace, Workspace Overview, and Recent Activity stacked down the page (intentionally
 * taller than one viewport; see HeroSection for why the first screen stays uncluttered).
 * Rendered only for the exact "/dashboard" route — see DashboardShell.
 */
export default function DashboardHome() {
  return (
    <div className="flex flex-col gap-10 pb-4">
      <HeroSection />
      <ContinueWorking />
      <WorkspaceSection />
      <WorkspaceOverview />
      <Suspense fallback={<RecentActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
      <DashboardFooter />
    </div>
  );
}

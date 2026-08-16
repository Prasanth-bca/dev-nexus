import { Suspense } from "react";
import type { ModuleContext } from "@/lib/kernel/context";
import { PageSkeleton } from "@/components/page-skeleton";
import { PROJECTS_COLLECTION, projectToDTO, type ProjectDoc } from "../db/collections";
import { ProjectsWorkspace } from "./ProjectsWorkspace";

export async function ProjectsPage({ ctx }: { ctx: ModuleContext }) {
  // Same defensive limit as this module's own GET / route (see server/routes.ts) — this SSR
  // loader was querying the full collection directly with no cap.
  const docs = await ctx.db.collection<ProjectDoc>(PROJECTS_COLLECTION).find().sort({ updatedAt: -1 }).limit(1000).toArray();
  const initialProjects = docs.map(projectToDTO);

  return (
    <Suspense fallback={<PageSkeleton variant="grid" />}>
      <ProjectsWorkspace initialProjects={initialProjects} />
    </Suspense>
  );
}

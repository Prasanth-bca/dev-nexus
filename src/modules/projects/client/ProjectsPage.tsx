import { Suspense } from "react";
import type { ModuleContext } from "@/lib/kernel/context";
import { PageSkeleton } from "@/components/page-skeleton";
import { PROJECTS_COLLECTION, projectToDTO, type ProjectDoc } from "../db/collections";
import { ProjectsWorkspace } from "./ProjectsWorkspace";

export async function ProjectsPage({ ctx }: { ctx: ModuleContext }) {
  const docs = await ctx.db.collection<ProjectDoc>(PROJECTS_COLLECTION).find().sort({ updatedAt: -1 }).toArray();
  const initialProjects = docs.map(projectToDTO);

  return (
    <Suspense fallback={<PageSkeleton variant="grid" />}>
      <ProjectsWorkspace initialProjects={initialProjects} />
    </Suspense>
  );
}

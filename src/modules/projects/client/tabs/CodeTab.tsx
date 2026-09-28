import type { ProjectTabProps } from "../ProjectDetail";
import { RepositoriesTab } from "./RepositoriesTab";
import { EnvironmentsTab } from "./EnvironmentsTab";

export function CodeTab({ project, onProjectUpdated }: ProjectTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Repositories</h3>
        <RepositoriesTab project={project} onProjectUpdated={onProjectUpdated} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Environments</h3>
        <EnvironmentsTab project={project} onProjectUpdated={onProjectUpdated} />
      </div>
    </div>
  );
}

import type { ProjectTabProps } from "../ProjectDetail";
import { NotesTab } from "./NotesTab";
import { FilesTab } from "./FilesTab";
import { LinksTab } from "./LinksTab";

export function DocsTab({ project, onProjectUpdated }: ProjectTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Notes</h3>
        <NotesTab project={project} onProjectUpdated={onProjectUpdated} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Files</h3>
        <FilesTab project={project} onProjectUpdated={onProjectUpdated} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Links</h3>
        <LinksTab project={project} onProjectUpdated={onProjectUpdated} />
      </div>
    </div>
  );
}

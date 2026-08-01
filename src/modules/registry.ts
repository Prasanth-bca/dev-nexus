import type { DevNexusModule } from "@/lib/kernel/types";
import { notesModule } from "./notes";
import { aiAssistantModule } from "./ai-assistant";
import { gmailModule } from "./gmail";
import { githubModule } from "./github";
import { fileVaultModule } from "./file-vault";
import { activityModule } from "./activity";

/** Adding a module = adding one line here. No filesystem scanning, no dynamic import() of arbitrary packages. */
export const MODULES: DevNexusModule[] = [
  notesModule,
  aiAssistantModule,
  gmailModule,
  githubModule,
  fileVaultModule,
  activityModule,
];

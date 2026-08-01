import type { ZodType } from "zod";
import type { ComponentType } from "react";
import type { ModuleContext } from "./context";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface RouteDefinition {
  method: HttpMethod;
  /** e.g. "/" or "/:id" — matched against the segments after /api/modules/<moduleId> */
  path: string;
  handler: (req: Request, params: Record<string, string>) => Promise<Response> | Response;
}

export interface PageDefinition {
  /** e.g. "/" — rendered at /dashboard/<moduleId> */
  path: string;
  component: ComponentType;
}

export interface ModuleManifest {
  id: string;
  name: string;
  category: string;
  icon?: string;
  version: string;
  navEntry?: { label: string; path: string };
  requiredSecrets?: string[];
  /** Documented, not enforced — a hint for what this module publishes on the event bus. */
  emits?: string[];
  defaultEnabled?: boolean;
}

export interface ModuleRegistration {
  routes: RouteDefinition[];
  pages: PageDefinition[];
}

export interface SearchResultItem {
  id: string;
  title: string;
  description?: string;
  /** Where clicking this result should go — a relative path within Dev Nexus, or an external URL when `external` is set. */
  url: string;
  external?: boolean;
}

export interface DashboardWidgetItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export interface DashboardWidget {
  /** Headline number for the card, e.g. { label: "Notes", value: 42 }. Omit if the module has nothing to count. */
  stat?: { label: string; value: string | number };
  /** Up to a handful of recent/relevant items — the card renders at most 4. */
  items: DashboardWidgetItem[];
  /** Shown instead of the item list when `items` is empty. */
  emptyMessage: string;
  /** "View all" link target — usually the module's own page. */
  href: string;
}

export interface DevNexusModule {
  manifest: ModuleManifest;
  configSchema?: ZodType;
  register(ctx: ModuleContext): ModuleRegistration;
  onEnable?(ctx: ModuleContext): Promise<void>;
  onDisable?(ctx: ModuleContext): Promise<void>;
  healthCheck?(ctx: ModuleContext): Promise<{ ok: boolean; message?: string }>;
  /** Optional: powers Global Search. Return up to a handful of relevant results for `query`. */
  search?(ctx: ModuleContext, query: string): Promise<SearchResultItem[]>;
  /** Optional: powers the module's Dashboard widget card. */
  widget?(ctx: ModuleContext): Promise<DashboardWidget>;
}

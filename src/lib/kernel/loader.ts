import { getDb } from "./db";
import { buildModuleContext, type ModuleContext } from "./context";
import type { DevNexusModule, ModuleRegistration } from "./types";

export interface LoadedModule {
  module: DevNexusModule;
  registration: ModuleRegistration;
  enabled: boolean;
  /** Only present when enabled — lets callers (e.g. Global Search) invoke module.search(ctx, query) directly. */
  ctx?: ModuleContext;
}

interface ModuleDoc {
  id: string;
  enabled: boolean;
  config: unknown;
}

async function loadAll(modules: DevNexusModule[]): Promise<LoadedModule[]> {
  const db = await getDb();
  const collection = db.collection<ModuleDoc>("modules");
  const results: LoadedModule[] = [];

  for (const mod of modules) {
    const id = mod.manifest.id;
    // Atomic upsert — a plain findOne-then-insertOne races when two requests hit this
    // concurrently before the doc exists (easy to trigger in dev, where this reruns
    // every request), producing duplicate module docs.
    const doc = await collection.findOneAndUpdate(
      { id },
      { $setOnInsert: { id, enabled: mod.manifest.defaultEnabled ?? false, config: {} } },
      { upsert: true, returnDocument: "after" }
    );
    const enabled = doc!.enabled;
    const config = doc!.config;

    if (!enabled) {
      results.push({ module: mod, registration: { routes: [], pages: [] }, enabled: false });
      continue;
    }

    const ctx = await buildModuleContext(id, config ?? {});
    const registration = mod.register(ctx);
    await mod.onEnable?.(ctx);
    results.push({ module: mod, registration, enabled: true, ctx });
  }

  return results;
}

declare global {
  var _devNexusLoadedModules: Promise<LoadedModule[]> | undefined;
}

/**
 * Loads + registers every module. In production this is cached for the life of the
 * server process (code doesn't change at runtime, so there's no reason to redo it
 * per request). In development it's rebuilt on every call instead — module registration
 * closes over component/route references, and caching those across Turbopack hot-reload
 * leads to stale references once a module's files change shape.
 */
export function getLoadedModules(modules: DevNexusModule[]): Promise<LoadedModule[]> {
  if (process.env.NODE_ENV !== "production") {
    return loadAll(modules);
  }
  if (!global._devNexusLoadedModules) {
    global._devNexusLoadedModules = loadAll(modules);
  }
  return global._devNexusLoadedModules;
}

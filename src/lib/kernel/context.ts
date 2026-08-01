import type { Db } from "mongodb";
import { getDb } from "./db";
import { getSharedEventBus, type EventBus } from "./events";
import { createLogger, type Logger } from "./logger";
import { getSecret } from "./secrets";

export interface ModuleContext {
  db: Db;
  secrets: { get(name: string): Promise<string> };
  events: EventBus;
  logger: Logger;
  config: unknown;
}

/**
 * The only way a module gets access to shared resources. Modules never import
 * a global Mongo client, secret store, or each other directly — everything
 * comes through this context, which is what lets the static module registry
 * be swapped for dynamic plugin loading later without touching module code.
 */
export async function buildModuleContext(moduleId: string, config: unknown): Promise<ModuleContext> {
  const db = await getDb();
  return {
    db,
    secrets: { get: getSecret },
    events: getSharedEventBus().scopedTo(moduleId),
    logger: createLogger(moduleId),
    config,
  };
}

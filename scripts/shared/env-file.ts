import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ENV_LOCAL_PATH } from "./paths";

export type EnvMap = Record<string, string>;

/** Minimal KEY=VALUE parser for our own generated .env files — no dotenv dependency needed
 *  for a format this simple (no multiline values, no variable interpolation). */
export function parseEnvFile(content: string): EnvMap {
  const result: EnvMap = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function readEnvFile(filePath: string): EnvMap {
  if (!existsSync(filePath)) return {};
  return parseEnvFile(readFileSync(filePath, "utf8"));
}

export function writeEnvFile(filePath: string, values: EnvMap): void {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

/**
 * Loads .env.local into process.env (without clobbering anything already set, e.g. by the
 * shell) — must run before any kernel module that reads process.env.* at import time. Every
 * CLI entry point imports scripts/shared/bootstrap.ts first specifically to guarantee this
 * ordering, since dynamic `import()` (not static `import`) is what defers the kernel imports
 * until after this has run.
 */
export function loadEnvFile(filePath: string = ENV_LOCAL_PATH): void {
  const values = readEnvFile(filePath);
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

import { loadEnvFile } from "./env-file";

/**
 * Side-effect-only module — every CLI entry point (setup/doctor/backup/restore/reset)
 * imports this FIRST, before anything else. Reason: ES module imports are hoisted and
 * resolved before any other top-level code runs, so there's no way to "load env, then
 * import the kernel" within a single file using static imports alone — the kernel's
 * db.ts reads process.env.MONGODB_URI at module-evaluation time. This module loads
 * .env.local into process.env as its own import side effect; every kernel import after
 * it must then use dynamic `await import(...)` (deferred to runtime) rather than a
 * static import, so it only resolves once this has already run.
 */
loadEnvFile();

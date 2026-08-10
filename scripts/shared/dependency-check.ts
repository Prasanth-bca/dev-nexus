import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { PROJECT_ROOT } from "./paths";

/** A handful of packages the app and its own CLI tooling can't run without —
 *  not an exhaustive audit of package.json, just a fast "did `npm install` actually work" check. */
const CRITICAL_PACKAGES = ["next", "react", "mongodb", "adm-zip", "tsx"];

export interface DependencyCheckResult {
  nodeModulesInstalled: boolean;
  missingPackages: string[];
}

export function checkDependencies(): DependencyCheckResult {
  const nodeModulesInstalled = existsSync(path.join(PROJECT_ROOT, "node_modules"));
  const missingPackages: string[] = [];

  if (nodeModulesInstalled) {
    const requireFromRoot = createRequire(path.join(PROJECT_ROOT, "package.json"));
    for (const pkg of CRITICAL_PACKAGES) {
      try {
        requireFromRoot.resolve(pkg);
      } catch {
        missingPackages.push(pkg);
      }
    }
  }

  return { nodeModulesInstalled, missingPackages };
}

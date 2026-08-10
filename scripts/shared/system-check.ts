import { access, constants } from "node:fs/promises";
import { execSync } from "node:child_process";
import os from "node:os";
import { PROJECT_ROOT } from "./paths";

export interface RequirementResult {
  label: string;
  ok: boolean;
  detail: string;
}

const MIN_NODE_MAJOR = 20;

function parseNodeMajor(versionString: string): number {
  const match = /^v?(\d+)\./.exec(versionString);
  return match ? Number(match[1]) : 0;
}

export function checkNodeVersion(): RequirementResult {
  const version = process.version;
  const major = parseNodeMajor(version);
  return {
    label: "Node.js",
    ok: major >= MIN_NODE_MAJOR,
    detail: major >= MIN_NODE_MAJOR ? version : `${version} — Dev Nexus requires Node ${MIN_NODE_MAJOR}+`,
  };
}

export function checkNpmVersion(): RequirementResult {
  try {
    const version = execSync("npm --version", { encoding: "utf8" }).trim();
    return { label: "npm", ok: true, detail: version };
  } catch {
    return { label: "npm", ok: false, detail: "npm was not found on PATH" };
  }
}

export function checkOsCompatibility(): RequirementResult {
  const platform = os.platform();
  const supported = platform === "win32" || platform === "darwin" || platform === "linux";
  return { label: "Operating system", ok: supported, detail: `${platform} (${os.arch()})` };
}

export async function checkWritePermissions(): Promise<RequirementResult> {
  try {
    await access(PROJECT_ROOT, constants.W_OK);
    return { label: "File permissions", ok: true, detail: PROJECT_ROOT };
  } catch {
    return { label: "File permissions", ok: false, detail: `No write access to ${PROJECT_ROOT}` };
  }
}

/** Reused by both `npm run setup` (Step 1) and `npm run doctor`. */
export async function checkSystemRequirements(): Promise<RequirementResult[]> {
  return [checkNodeVersion(), checkNpmVersion(), checkOsCompatibility(), await checkWritePermissions()];
}

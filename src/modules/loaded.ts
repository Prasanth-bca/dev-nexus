import { getLoadedModules } from "@/lib/kernel/loader";
import { MODULES } from "./registry";

export function getModules() {
  return getLoadedModules(MODULES);
}

import { FolderGit2, History, LayoutGrid, Mail, Settings, Sparkles, StickyNote, Vault, KeyRound, type LucideIcon } from "lucide-react";

/** Manual, not dynamic — mirrors the registry.ts philosophy of no scanning/dynamic import of arbitrary names. Add an entry whenever a module's manifest.icon introduces a new name. */
const ICONS: Record<string, LucideIcon> = {
  StickyNote,
  Sparkles,
  Mail,
  FolderGit2,
  Vault,
  History,
  Settings,
  KeyRound,
};

export function getModuleIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || LayoutGrid;
}

/**
 * Each module owns one accent colour, used for its nav icon, active indicator,
 * and the coloured top border on its dashboard widget. Keyed by manifest id so
 * a module's visual identity travels with it rather than being re-picked per screen.
 * Values are CSS custom properties defined in globals.css.
 */
const MODULE_ACCENTS: Record<string, string> = {
  notes: "var(--module-notes)",
  "ai-assistant": "var(--module-ai)",
  gmail: "var(--module-gmail)",
  github: "var(--module-github)",
  "file-vault": "var(--module-vault)",
  activity: "var(--module-activity)",
  secrets: "var(--module-secrets)",
};

export function getModuleAccent(moduleId?: string): string {
  return (moduleId && MODULE_ACCENTS[moduleId]) || "var(--primary)";
}

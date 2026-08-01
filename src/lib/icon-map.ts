import { FolderGit2, History, LayoutGrid, Mail, Sparkles, StickyNote, Vault, type LucideIcon } from "lucide-react";

/** Manual, not dynamic — mirrors the registry.ts philosophy of no scanning/dynamic import of arbitrary names. Add an entry whenever a module's manifest.icon introduces a new name. */
const ICONS: Record<string, LucideIcon> = {
  StickyNote,
  Sparkles,
  Mail,
  FolderGit2,
  Vault,
  History,
};

export function getModuleIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || LayoutGrid;
}

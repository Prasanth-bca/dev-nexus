import Link from "next/link";
import { FolderKanban, KeyRound, MessageSquarePlus, Plus, Upload, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_ACTIONS: { label: string; href: string; icon: LucideIcon; accent: string }[] = [
  { label: "New Project", href: "/dashboard/projects?new=1", icon: FolderKanban, accent: "var(--module-projects)" },
  { label: "New Note", href: "/dashboard/notes?new=1", icon: Plus, accent: "var(--module-notes)" },
  { label: "New Chat", href: "/dashboard/ai-assistant?new=1", icon: MessageSquarePlus, accent: "var(--module-ai)" },
  { label: "Upload File", href: "/dashboard/file-vault", icon: Upload, accent: "var(--module-vault)" },
  { label: "Store Secret", href: "/dashboard/secrets", icon: KeyRound, accent: "var(--module-secrets)" },
];

/**
 * Secondary to the hero search by design — compact pills, not cards. Deliberately smaller
 * and quieter than the search bar above them (see HeroSection), per the redesign spec's
 * "search is primary, quick actions are secondary" rule.
 */
export function QuickActions() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          style={{ "--accent": action.accent } as React.CSSProperties}
          className={cn(
            "glass lift flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
            "hover:text-[var(--accent)]"
          )}
        >
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </Link>
      ))}
    </div>
  );
}

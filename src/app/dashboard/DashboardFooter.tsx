import Link from "next/link";

export function DashboardFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pb-8 text-xs text-muted-foreground">
      <span>Dev Nexus — your personal developer workspace.</span>
      <div className="flex items-center gap-4">
        <Link href="/dashboard/about" className="transition-colors hover:text-foreground">
          About
        </Link>
        <Link href="/dashboard/settings" className="transition-colors hover:text-foreground">
          Settings
        </Link>
      </div>
    </footer>
  );
}

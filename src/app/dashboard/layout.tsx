import Link from "next/link";
import type { ReactNode } from "react";
import { getModules } from "@/modules/loaded";
import { LogoutButton } from "./LogoutButton";
import { CommandPalette } from "@/components/command-palette";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const loaded = await getModules();
  const navItems = loaded
    .filter((m) => m.enabled && m.module.manifest.navEntry)
    .map((m) => m.module.manifest.navEntry!);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: 220, borderRight: "1px solid #333", padding: 16, display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Dev Nexus</div>
        <div style={{ marginBottom: 16 }}>
          <CommandPalette />
        </div>
        <Link href="/dashboard" style={{ display: "block", marginBottom: 8 }}>
          Dashboard
        </Link>
        <Link href="/dashboard/secrets" style={{ display: "block", marginBottom: 8 }}>
          Secrets
        </Link>
        <Link href="/dashboard/settings" style={{ display: "block", marginBottom: 8 }}>
          Settings
        </Link>
        {navItems.map((item) => (
          <Link key={item.path} href={item.path} style={{ display: "block", marginBottom: 8 }}>
            {item.label}
          </Link>
        ))}
        <LogoutButton />
      </nav>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}

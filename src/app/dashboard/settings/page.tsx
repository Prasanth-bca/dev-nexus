import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { getUserById } from "@/lib/kernel/auth-password";
import { PageHeader } from "@/components/page-header";
import { AccountForm } from "./AccountForm";
import { ReopenSetupCard } from "./ReopenSetupCard";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await getUserById(userId);
  if (!user) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <PageHeader
        title="Settings"
        description="Manage the credentials for your admin account."
        icon={Settings}
        accent="var(--muted-foreground)"
        className="mb-0"
      />
      <AccountForm currentEmail={user.email} />
      <ReopenSetupCard />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { getUserById } from "@/lib/kernel/auth-password";
import { AccountForm } from "./AccountForm";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await getUserById(userId);
  if (!user) redirect("/login");

  return (
    <div className="max-w-md">
      <h1 className="text-lg font-semibold mb-1">Settings</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Account</p>
      <AccountForm currentEmail={user.email} />
    </div>
  );
}

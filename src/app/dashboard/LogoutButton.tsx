"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        display: "block",
        marginTop: "auto",
        fontSize: 13,
        color: "#888",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        textAlign: "left",
      }}
    >
      Log out
    </button>
  );
}

"use client";

import { useEffect, useState } from "react";

interface ToolSetting {
  name: string;
  description: string;
  requiresConfirmation: boolean;
}

export function ToolSettingsView() {
  const [tools, setTools] = useState<ToolSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/modules/ai-assistant/tool-settings")
      .then((res) => res.json())
      .then(setTools)
      .finally(() => setLoading(false));
  }, []);

  async function toggle(name: string, next: boolean) {
    setTools((prev) => prev.map((t) => (t.name === name ? { ...t, requiresConfirmation: next } : t)));
    await fetch("/api/modules/ai-assistant/tool-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName: name, requiresConfirmation: next }),
    });
  }

  if (loading) return null;

  return (
    <div className="max-w-lg">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Choose which tools the assistant must pause and ask you to approve before running. Destructive or outbound-effect actions
        (deleting a note, sending an email) default to on.
      </p>
      <div className="flex flex-col gap-1">
        {tools.map((t) => (
          <label
            key={t.name}
            className="flex items-center justify-between gap-3 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-sm font-mono">{t.name}</div>
              <div className="text-[11px] text-zinc-400">{t.description}</div>
            </div>
            <input
              type="checkbox"
              checked={t.requiresConfirmation}
              onChange={(e) => toggle(t.name, e.target.checked)}
              className="shrink-0"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

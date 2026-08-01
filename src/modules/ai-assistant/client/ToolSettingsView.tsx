"use client";

import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/empty-state";
import { getModuleAccent } from "@/lib/icon-map";

const ACCENT = getModuleAccent("ai-assistant");

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
    <div style={{ "--accent": ACCENT } as React.CSSProperties} className="max-w-xl pb-2">
      <Card>
        <CardHeader>
          <CardTitle>Confirmation gates</CardTitle>
          <CardDescription>
            Choose which tools the assistant must pause and ask you to approve before running. Destructive or outbound-effect
            actions (deleting a note, sending an email) default to on.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {tools.length === 0 ? (
            <EmptyState accent={ACCENT} icon={Wrench} title="No tools available" description="This assistant has no tools registered yet." />
          ) : (
            <div className="stagger flex flex-col gap-2">
              {tools.map((t, i) => (
                <div
                  key={t.name}
                  style={{ "--i": i } as React.CSSProperties}
                  className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-border bg-foreground/[0.02] px-3 py-2.5 transition-colors hover:border-foreground/20 dark:bg-white/[0.03]"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-mono text-sm">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </div>
                  <Switch
                    checked={t.requiresConfirmation}
                    onCheckedChange={(next) => toggle(t.name, next)}
                    aria-label={`Require confirmation for ${t.name}`}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

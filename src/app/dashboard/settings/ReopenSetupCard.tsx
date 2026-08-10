"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Non-destructive — reopens the First-Time Setup Wizard to revisit/reconfigure
 *  integrations without touching any existing data, notes, files, or connections. */
export function ReopenSetupCard() {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  async function handleClick() {
    setOpening(true);
    try {
      await fetch("/api/setup/reopen", { method: "POST" });
      router.push("/setup");
    } finally {
      setOpening(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 aria-hidden className="h-4 w-4 text-muted-foreground" />
          Setup & Onboarding
        </CardTitle>
        <CardDescription>Revisit the setup wizard to reconfigure integrations. Your data is never touched.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={handleClick} disabled={opening} className="h-10 gap-1.5 px-4">
          {opening ? "Opening…" : "Re-run Setup Wizard"}
        </Button>
      </CardContent>
    </Card>
  );
}

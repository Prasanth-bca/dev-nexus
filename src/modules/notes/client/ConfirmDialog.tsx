"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConfirmAction {
  label: string;
  tone?: "primary" | "danger" | "default";
  onClick: () => void;
}

/**
 * Notes-local because it takes an arbitrary action list — the unsaved-changes prompt
 * needs three (Save / Discard / Cancel), which the shared two-action
 * `@/components/confirm-dialog` deliberately doesn't model.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  actions,
  onDismiss,
}: {
  open: boolean;
  title: string;
  description: string;
  actions: ConfirmAction[];
  onDismiss: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {actions.map((action) => (
            <Button
              key={action.label}
              type="button"
              onClick={action.onClick}
              variant={action.tone === "primary" ? "default" : action.tone === "danger" ? "destructive" : "outline"}
            >
              {action.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

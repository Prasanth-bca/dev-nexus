"use client";

interface ConfirmAction {
  label: string;
  tone?: "primary" | "danger" | "default";
  onClick: () => void;
}

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
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm mx-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-lg"
      >
        <h2 className="text-sm font-semibold mb-1">{title}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{description}</p>
        <div className="flex justify-end gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={
                "text-sm px-3 py-1.5 rounded-md " +
                (action.tone === "primary"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : action.tone === "danger"
                    ? "bg-red-600 text-white"
                    : "border border-zinc-200 dark:border-zinc-800")
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

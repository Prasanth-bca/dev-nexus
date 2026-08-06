"use client";

import { useState } from "react";
import { X } from "lucide-react";

/** Shared chip-list input for Projects' tags and tech-stack fields — same interaction as Notes' TagsInput. */
export function TagsInput({
  values,
  onChange,
  placeholder = "Add…",
  ariaLabel = "Add an item",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [input, setInput] = useState("");

  function commit() {
    const value = input.trim().replace(/,$/, "");
    if (value && !values.includes(value)) onChange([...values, value]);
    setInput("");
  }

  return (
    <div className="focus-glow flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-foreground/[0.03] px-2 py-1 transition-all duration-200 dark:bg-white/[0.04]">
      {values.map((value) => (
        <span key={value} className="flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-xs dark:bg-white/[0.08]">
          {value}
          <button
            type="button"
            aria-label={`Remove ${value}`}
            onClick={() => onChange(values.filter((v) => v !== value))}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={values.length === 0 ? placeholder : ""}
        aria-label={ariaLabel}
        className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

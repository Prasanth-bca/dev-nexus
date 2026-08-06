import { Archive, CheckCircle2, CircleDot, Lightbulb, PauseCircle, type LucideIcon } from "lucide-react";
import type { ProjectPriority, ProjectStatus } from "../db/collections";

export const STATUS_META: Record<ProjectStatus, { icon: LucideIcon; tone: string }> = {
  Planning: { icon: Lightbulb, tone: "#eab308" },
  Active: { icon: CircleDot, tone: "#22c55e" },
  Paused: { icon: PauseCircle, tone: "#f97316" },
  Completed: { icon: CheckCircle2, tone: "#3b82f6" },
  Archived: { icon: Archive, tone: "#71717a" },
};

export const PRIORITY_META: Record<ProjectPriority, { label: string; tone: string }> = {
  Low: { label: "Low", tone: "#71717a" },
  Medium: { label: "Medium", tone: "#3b82f6" },
  High: { label: "High", tone: "#f97316" },
  Critical: { label: "Critical", tone: "#ef4444" },
};

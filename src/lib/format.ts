const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["week", 1000 * 60 * 60 * 24 * 7],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/** "2h ago", "3d ago", "just now" — used anywhere a timestamp needs to read at a glance. */
export function formatRelativeTime(date: Date | string): string {
  const ms = new Date(date).getTime() - Date.now();
  const abs = Math.abs(ms);

  for (const [unit, unitMs] of UNITS) {
    if (abs >= unitMs) {
      return rtf.format(Math.round(ms / unitMs), unit);
    }
  }
  return "just now";
}

const BYTE_UNITS = ["B", "KB", "MB", "GB"];

/** "1.2 MB", "840 B" — used for file sizes. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${BYTE_UNITS[unitIndex]}`;
}

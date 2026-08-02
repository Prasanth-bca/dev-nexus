/**
 * A minimal inline trend line — no charting library, just SVG. Deliberately has no
 * "use client": it's a pure function of its props with no interactivity, so it never
 * needs to ship as client JS even when a Server Component renders it.
 */
export function Sparkline({ data, accent }: { data: number[]; accent: string }) {
  if (data.length < 2) return null;

  const width = 100;
  const height = 28;
  const max = Math.max(...data, 1);
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(2)},${(height - (v / max) * height).toFixed(2)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-7 w-full" role="img" aria-label="7-day activity trend">
      <polyline points={points} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

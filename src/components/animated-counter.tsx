"use client";

import { useEffect, useState } from "react";

/**
 * Counts up from 0 to `value` on mount. Receives the already-resolved number as a prop
 * from a Server Component — this component never fetches anything itself, it only
 * animates a value someone else already loaded.
 */
export function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const skipAnimation = window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0;
    const duration = 700;
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      if (skipAnimation) {
        setDisplay(value);
        return;
      }
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

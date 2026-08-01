import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides Next.js's own dev-mode overlay (the floating "N" badge and its route/bundler
  // panel). It only ever renders during `next dev` — never in a production build — but it
  // sits bottom-left, directly on top of the sidebar's Log out control. Compile and
  // runtime errors are still surfaced normally.
  devIndicators: false,
};

export default nextConfig;

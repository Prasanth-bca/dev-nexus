import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides Next.js's own dev-mode overlay (the floating "N" badge and its route/bundler
  // panel). It only ever renders during `next dev` — never in a production build — but it
  // sits bottom-left, directly on top of the sidebar's Log out control. Compile and
  // runtime errors are still surfaced normally.
  devIndicators: false,

  // Docker production build — emits a self-contained .next/standalone folder with a
  // minimal server.js, so the runtime image needs no node_modules install (see Dockerfile).
  output: "standalone",

  // Packages with native bindings or complex require() patterns that Next's bundler
  // shouldn't inline — keep them external and copy to node_modules via file tracing.
  serverExternalPackages: ["imap-simple", "mailparser", "nodemailer", "redis"],
};

export default nextConfig;

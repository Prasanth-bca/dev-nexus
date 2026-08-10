import "../shared/bootstrap";
import { banner } from "../shared/logger";

async function main() {
  banner("🚀 Dev Nexus Installer", "Sets up MongoDB, security keys, storage, and your admin account.");

  const systemCheck = await import("./steps/01-system-check");
  const passed = await systemCheck.run();
  if (!passed) {
    console.error("\nFix the issues above and re-run `npm run setup`.\n");
    process.exit(1);
  }

  await (await import("./steps/02-environment")).run();
  await (await import("./steps/03-security-keys")).run();
  await (await import("./steps/04-mongodb")).run();
  await (await import("./steps/05-database-init")).run();
  await (await import("./steps/06-admin-account")).run();
  await (await import("./steps/07-storage")).run();

  const validation = await (await import("./steps/09-validate")).run();
  (await import("./steps/10-complete")).run(validation);

  // A live MongoClient connection (opened by the kernel's getDb()) keeps the event loop
  // alive otherwise — this is a one-shot script, not the long-running Next.js server.
  process.exit(Object.values(validation).every(Boolean) ? 0 : 1);
}

main().catch((err) => {
  console.error("\nSetup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

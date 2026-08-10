import "../shared/bootstrap";
import { banner, step, ok, fail, blank, rule } from "../shared/logger";
import { checkSystemRequirements } from "../shared/system-check";
import { checkDependencies } from "../shared/dependency-check";

/** Read-only health check — never creates, modifies, or deletes anything. Reuses the exact
 *  same validation `npm run setup` ends with (steps 09-validate.ts), so "doctor says healthy"
 *  and "setup completed successfully" always mean the same thing. */
async function main() {
  banner("🩺 Dev Nexus Doctor", "Checks the health of your installation.");

  let allOk = true;

  step("System requirements");
  for (const r of await checkSystemRequirements()) {
    if (r.ok) ok(`${r.label} — ${r.detail}`);
    else {
      fail(`${r.label} — ${r.detail}`);
      allOk = false;
    }
  }

  step("Dependencies");
  const deps = checkDependencies();
  if (deps.nodeModulesInstalled) {
    ok("node_modules present");
  } else {
    fail("node_modules missing — run `npm install`");
    allOk = false;
  }
  if (deps.nodeModulesInstalled && deps.missingPackages.length > 0) {
    fail(`Missing packages: ${deps.missingPackages.join(", ")} — run \`npm install\``);
    allOk = false;
  } else if (deps.nodeModulesInstalled) {
    ok("Critical packages resolvable");
  }

  const validation = await (await import("../setup/steps/09-validate")).run();
  if (!Object.values(validation).every(Boolean)) allOk = false;

  blank();
  rule();
  console.log(allOk ? "✓ All checks passed — Dev Nexus is healthy." : "✗ Some checks failed — see above.");
  rule();
  blank();

  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error("\nDoctor failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

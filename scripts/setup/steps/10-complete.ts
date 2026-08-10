import { color } from "../../shared/colors";
import { rule, ok, fail, blank } from "../../shared/logger";
import type { ValidationResult } from "./09-validate";

/** Step 10 — Completion Screen. */
export function run(validation: ValidationResult): void {
  blank();
  rule();
  console.log(color.bold("Dev Nexus Setup Complete"));
  rule();
  blank();

  ok(`Database ${validation.database ? "Ready" : "NOT READY"}`);
  ok(`Admin ${validation.authentication ? "Ready" : "NOT READY"}`);
  ok(`Storage ${validation.storage ? "Ready" : "NOT READY"}`);
  ok(`Modules ${validation.modules ? "Ready" : "NOT READY"}`);
  ok(`Encryption ${validation.secrets ? "Ready" : "NOT READY"}`);

  blank();
  rule();
  blank();

  const allReady = Object.values(validation).every(Boolean);
  if (allReady) {
    console.log("Run");
    console.log(color.cyan("  npm run dev"));
    console.log("Open");
    console.log(color.cyan("  http://localhost:3000"));
    blank();
    console.log(color.dim("AI Assistant, Gmail, and GitHub are optional — log in and finish"));
    console.log(color.dim("connecting them from the setup wizard that opens automatically,"));
    console.log(color.dim("or anytime later from Settings → Re-run Setup Wizard."));
  } else {
    fail("Some checks did not pass — run `npm run doctor` for a detailed report before continuing.");
  }

  blank();
  rule();
  blank();
}

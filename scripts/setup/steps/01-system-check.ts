import { step, ok, fail } from "../../shared/logger";
import { checkSystemRequirements } from "../../shared/system-check";

/** Step 1 — System Requirements. Returns false if anything required is missing, so the
 *  wizard can stop before touching the environment/database at all. */
export async function run(): Promise<boolean> {
  step("Checking system requirements…");

  const results = await checkSystemRequirements();
  let allOk = true;
  for (const r of results) {
    if (r.ok) ok(`${r.label} — ${r.detail}`);
    else {
      fail(`${r.label} — ${r.detail}`);
      allOk = false;
    }
  }
  return allOk;
}

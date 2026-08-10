import { step, ok, fail, info } from "../../shared/logger";
import { askText, askPassword } from "../../shared/prompt";

/** Step 6 — Admin Account. Reuses the exact same createAdminUser()/hasAnyUser() the web
 *  login form calls — same hashing, same "only succeeds once" duplicate guard — so a CLI
 *  install and a web-first install are equally safe to mix. */
export async function run(): Promise<void> {
  step("Setting up the admin account…");

  const { hasAnyUser, createAdminUser } = await import("@/lib/kernel/auth-password");

  if (await hasAnyUser()) {
    info("An admin account already exists — skipping.");
    return;
  }

  for (;;) {
    const email = await askText("Admin email");
    if (!email.includes("@")) {
      fail("Enter a valid email address.");
      continue;
    }

    const password = await askPassword("Admin password (min 8 characters)");
    if (password.length < 8) {
      fail("Password must be at least 8 characters.");
      continue;
    }

    const confirm = await askPassword("Confirm password");
    if (confirm !== password) {
      fail("Passwords did not match — try again.");
      continue;
    }

    try {
      await createAdminUser(email, password);
      ok(`Admin account created for ${email}`);
      return;
    } catch (err) {
      fail(err instanceof Error ? err.message : "Could not create admin account.");
    }
  }
}

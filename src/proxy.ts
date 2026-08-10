import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/kernel/auth-session";
import { getSetupState } from "@/lib/kernel/setup-state";

export const config = {
  matcher: ["/dashboard/:path*", "/setup", "/api/modules/:path*", "/api/secrets/:path*", "/api/search"],
};

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = await verifySessionToken(token);

  if (!userId) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // First-Time Setup Wizard gate — same shape as the auth gate above, one layer in:
  // a valid session isn't enough to reach /dashboard until setup is marked complete.
  // /setup itself is exempt (that's where we're sending them) and API routes are left
  // alone here since each module route works standalone before setup finishes.
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isSetupPage = req.nextUrl.pathname === "/setup";
  if (isDashboard || isSetupPage) {
    const setup = await getSetupState();
    if (!setup.completed && isDashboard) {
      return NextResponse.redirect(new URL("/setup", req.url));
    }
    if (setup.completed && isSetupPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

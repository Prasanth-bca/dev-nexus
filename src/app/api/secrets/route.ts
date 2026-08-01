import { listSecretNames, setSecret } from "@/lib/kernel/secrets";

export async function GET() {
  return Response.json(await listSecretNames());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const value = typeof body.value === "string" ? body.value : "";

  if (!/^[A-Z0-9_]+$/.test(name)) {
    return Response.json({ error: "Name must be UPPER_SNAKE_CASE (e.g. GMAIL_CLIENT_ID)." }, { status: 400 });
  }
  if (!value) {
    return Response.json({ error: "Value is required." }, { status: 400 });
  }

  await setSecret(name, value);
  return Response.json({ ok: true }, { status: 201 });
}

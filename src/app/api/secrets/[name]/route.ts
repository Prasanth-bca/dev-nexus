import { deleteSecret, getSecret } from "@/lib/kernel/secrets";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  try {
    const value = await getSecret(name);
    return Response.json({ value });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  await deleteSecret(name);
  return Response.json({ ok: true });
}

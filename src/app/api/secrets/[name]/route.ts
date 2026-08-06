import { deleteSecret, getSecret, setSecretProject } from "@/lib/kernel/secrets";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  try {
    const value = await getSecret(name);
    return Response.json({ value });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}

/** Assigns/clears which project this secret belongs to — the value itself is untouched. */
export async function PUT(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const projectId = typeof body.projectId === "string" && body.projectId ? body.projectId : null;
  await setSecretProject(name, projectId);
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  await deleteSecret(name);
  return Response.json({ ok: true });
}

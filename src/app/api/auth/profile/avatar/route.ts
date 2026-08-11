import { getCurrentUserId } from "@/lib/kernel/auth-current-user";
import { getUserById, setUserAvatarKey, clearUserAvatarKey } from "@/lib/kernel/auth-password";
import { deleteAvatarFile, isAllowedAvatarType, readAvatarFile, saveAvatarFile } from "@/lib/kernel/avatar-storage";

const MAX_SIZE = 5 * 1024 * 1024;

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserById(userId);
  const storageKey = user?.profile.avatarStorageKey;
  if (!storageKey) return Response.json({ error: "No avatar set." }, { status: 404 });

  try {
    const buffer = await readAvatarFile(storageKey);
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "image/*", "Cache-Control": "private, max-age=300" } });
  } catch {
    return Response.json({ error: "Avatar file is missing on disk." }, { status: 404 });
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Avatar must be 5MB or smaller." }, { status: 400 });
  }
  const mimeType = file.type || "application/octet-stream";
  if (!isAllowedAvatarType(mimeType)) {
    return Response.json({ error: "Avatar must be a PNG, JPEG, WebP, or GIF image." }, { status: 400 });
  }

  const previousKey = (await getUserById(userId))?.profile.avatarStorageKey;

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = await saveAvatarFile(buffer, mimeType);
  await setUserAvatarKey(userId, storageKey);

  if (previousKey) await deleteAvatarFile(previousKey);

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const previousKey = await clearUserAvatarKey(userId);
  if (previousKey) await deleteAvatarFile(previousKey);

  return Response.json({ ok: true });
}

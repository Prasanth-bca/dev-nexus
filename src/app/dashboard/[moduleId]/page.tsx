import { notFound } from "next/navigation";
import { getModules } from "@/modules/loaded";

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const loaded = await getModules();
  const found = loaded.find((m) => m.module.manifest.id === moduleId);

  if (!found || !found.enabled) notFound();

  const pageDef = found.registration.pages.find((p) => p.path === "/");
  if (!pageDef) notFound();

  const Component = pageDef.component;
  return <Component />;
}

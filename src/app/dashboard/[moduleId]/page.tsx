import { notFound } from "next/navigation";
import { getModulesOnce } from "../dashboard-data";

// Force dynamic rendering — this page reads from MongoDB
export const dynamic = 'force-dynamic';

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const loaded = await getModulesOnce();
  const found = loaded.find((m) => m.module.manifest.id === moduleId);

  if (!found || !found.enabled) notFound();

  const pageDef = found.registration.pages.find((p) => p.path === "/");
  if (!pageDef) notFound();

  const Component = pageDef.component;
  return <Component />;
}

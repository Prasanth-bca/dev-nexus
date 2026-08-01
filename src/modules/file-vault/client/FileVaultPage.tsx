import { Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { FileVaultView } from "./FileVaultView";

export function FileVaultPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="grid" />}>
      <FileVaultView />
    </Suspense>
  );
}

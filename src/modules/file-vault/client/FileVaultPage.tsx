import { Suspense } from "react";
import { FileVaultView } from "./FileVaultView";

export function FileVaultPage() {
  return (
    <Suspense fallback={null}>
      <FileVaultView />
    </Suspense>
  );
}

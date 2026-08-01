import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./LoginForm";

/**
 * Deliberately a server component: the form is client-only (it calls
 * `useSearchParams()`), so keeping this shell on the server is what lets the
 * card frame and skeleton render in the initial HTML instead of a blank page.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-xl" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

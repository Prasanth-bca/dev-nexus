import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for `<Suspense>` boundaries around client components that call
 * `useSearchParams()` (which forces client rendering). A `fallback={null}` there
 * shows a blank page on first paint — this keeps the layout stable instead.
 */
export function PageSkeleton({ variant = "page" }: { variant?: "page" | "split" | "grid" | "card" }) {
  const header = (
    <div className="mb-6 flex items-center gap-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-64" />
      </div>
    </div>
  );

  if (variant === "card") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Skeleton className="h-[380px] w-full max-w-sm rounded-xl" />
      </div>
    );
  }

  if (variant === "split") {
    return (
      <div className="flex h-full flex-col">
        {header}
        <div className="flex min-h-0 flex-1 gap-3">
          <Skeleton className="hidden w-80 shrink-0 rounded-xl md:block" />
          <Skeleton className="min-h-[400px] flex-1 rounded-xl" />
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div>
        {header}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

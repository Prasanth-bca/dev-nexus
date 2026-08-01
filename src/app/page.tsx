import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="animate-fade-in-up glass flex w-full max-w-md flex-col items-center gap-6 rounded-xl p-8 text-center sm:p-10">
        {/* Product mark — same gradient tile as the sidebar and login screen. */}
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-xl font-bold text-white shadow-[0_6px_20px_color-mix(in_srgb,var(--primary)_40%,transparent)]">
          N
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Dev Nexus</h1>
          <p className="text-sm text-balance text-muted-foreground">One Platform. Complete Developer Control.</p>
        </div>

        <Link href="/dashboard" className={cn(buttonVariants({ variant: "default" }), "h-11 gap-2 px-5")}>
          Open Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

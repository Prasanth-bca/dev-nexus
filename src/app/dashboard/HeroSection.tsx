import { getGreetingName, timeOfDayGreeting } from "./dashboard-data";
import { CommandPalette } from "@/components/command-palette";
import { QuickActions } from "./QuickActions";

/**
 * The first thing the homepage shows — search-first, not stats-first. Generous whitespace
 * is intentional (redesign spec section 5/15): this is the entire first viewport at
 * 1366×768, with everything else reachable by scrolling.
 */
export async function HeroSection() {
  const [name, greeting] = [await getGreetingName(), timeOfDayGreeting()];

  return (
    <section className="animate-fade-in-up mx-auto flex max-w-3xl flex-col items-center gap-7 px-6 pt-20 pb-12 text-center sm:pt-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.25rem]">
          Good {greeting}, {name}
        </h1>
        <p className="text-[15px] text-muted-foreground">Search anything, open any tool, and continue where you left off.</p>
      </div>

      <div className="w-full">
        <CommandPalette variant="hero" />
      </div>

      <QuickActions />
    </section>
  );
}

import { color } from "./colors";

const RULE = "━".repeat(28);

/** A titled section divider — used for the installer's top banner and the completion screen. */
export function banner(title: string, subtitle?: string): void {
  console.log(`\n${color.cyan(RULE)}`);
  console.log(color.bold(title));
  if (subtitle) console.log(color.dim(subtitle));
  console.log(`${color.cyan(RULE)}\n`);
}

export function rule(): void {
  console.log(color.cyan(RULE));
}

/** A step heading, e.g. "Checking Environment…" */
export function step(label: string): void {
  console.log(`\n${color.bold(label)}`);
}

export function ok(label: string): void {
  console.log(`  ${color.green("✓")} ${label}`);
}

export function fail(label: string): void {
  console.log(`  ${color.red("✗")} ${label}`);
}

export function warn(label: string): void {
  console.log(`  ${color.yellow("!")} ${label}`);
}

export function info(label: string): void {
  console.log(`  ${color.gray(label)}`);
}

export function blank(): void {
  console.log("");
}

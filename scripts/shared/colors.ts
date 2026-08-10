/** Minimal ANSI color helpers — no chalk dependency needed for a handful of codes.
 *  Every wrapped function no-ops (returns plain text) when stdout isn't a TTY, so
 *  piped/redirected output (CI logs, `npm run setup > log.txt`) stays readable. */
const isTTY = Boolean(process.stdout.isTTY);

function wrap(code: string): (text: string) => string {
  return (text: string) => (isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
}

export const color = {
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  blue: wrap("34"),
  magenta: wrap("35"),
  cyan: wrap("36"),
  gray: wrap("90"),
  bold: wrap("1"),
  dim: wrap("2"),
};

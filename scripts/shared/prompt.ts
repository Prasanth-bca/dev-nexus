import { stdin, stdout } from "node:process";

const KEYCODE_ENTER_LF = 10;
const KEYCODE_ENTER_CR = 13;
const KEYCODE_EOF = 4; // Ctrl+D
const KEYCODE_INTERRUPT = 3; // Ctrl+C
const KEYCODE_BACKSPACE = 127;
const KEYCODE_BACKSPACE_ALT = 8;

/**
 * A hand-rolled line reader, not Node's `readline` — an earlier version opened a fresh
 * `readline` interface per call, which silently dropped input: piped/buffered stdin can
 * deliver several lines in a single chunk, and closing an interface after reading just the
 * first of them discards the rest. This version keeps ONE persistent listener for the
 * whole process, splits every chunk into as many complete lines as it contains, and queues
 * any extra lines for the next call instead of losing them — found and fixed by testing
 * `npm run setup` with piped answers.
 */
const lineQueue: string[] = [];
let currentChars: string[] = [];
let pending: { resolve: (line: string) => void; mask: boolean } | null = null;
let listenerAttached = false;
let rawModeEngaged = false;

function onData(buf: Buffer): void {
  for (const ch of buf.toString("utf8")) {
    const code = ch.charCodeAt(0);

    if (code === KEYCODE_ENTER_LF || code === KEYCODE_ENTER_CR || code === KEYCODE_EOF) {
      const line = currentChars.join("");
      currentChars = [];
      if (rawModeEngaged) stdout.write("\n");
      if (pending) {
        const resolve = pending.resolve;
        pending = null;
        resolve(line);
      } else {
        lineQueue.push(line);
      }
      continue;
    }
    if (code === KEYCODE_INTERRUPT) {
      stdout.write("\n");
      process.exit(1);
    }
    if (code === KEYCODE_BACKSPACE || code === KEYCODE_BACKSPACE_ALT) {
      if (currentChars.length > 0) {
        currentChars.pop();
        if (rawModeEngaged && pending && !pending.mask) stdout.write("\b \b");
      }
      continue;
    }

    currentChars.push(ch);
    // Raw mode disables the terminal's own echo, so a plain (non-masked) prompt has to
    // echo manually; piped/non-TTY input has no visible terminal to echo to anyway.
    if (rawModeEngaged && pending && !pending.mask) stdout.write(ch);
  }
}

function ensureListening(): void {
  if (listenerAttached) return;
  listenerAttached = true;
  if (stdin.isTTY) {
    rawModeEngaged = true;
    stdin.setRawMode?.(true);
  }
  stdin.on("data", onData);
  stdin.resume();
}

/** Restores the terminal to normal (cooked) mode — registered once so it runs no matter
 *  how the process ends, since leaving a real TTY in raw mode would break the user's shell. */
process.on("exit", () => {
  if (rawModeEngaged) stdin.setRawMode?.(false);
});

function readLine(mask: boolean): Promise<string> {
  ensureListening();
  const queued = lineQueue.shift();
  if (queued !== undefined) return Promise.resolve(queued);
  return new Promise((resolve) => {
    pending = { resolve, mask };
  });
}

/** Plain text prompt, Enter keeps `defaultValue` (shown in parens) if provided. */
export async function askText(question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  stdout.write(`${question}${suffix}: `);
  const answer = (await readLine(false)).trim();
  return answer || defaultValue || "";
}

/** y/N prompt — Enter alone keeps `defaultYes`. */
export async function askConfirm(question: string, defaultYes = false): Promise<boolean> {
  const suffix = defaultYes ? "Y/n" : "y/N";
  const raw = (await askText(`${question} (${suffix})`)).toLowerCase();
  if (!raw) return defaultYes;
  return raw === "y" || raw === "yes";
}

/** Masked password prompt — same reader as askText, with echo suppressed. */
export async function askPassword(question: string): Promise<string> {
  stdout.write(`${question}: `);
  return readLine(true);
}

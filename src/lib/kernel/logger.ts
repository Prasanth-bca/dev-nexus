export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export function createLogger(scope: string): Logger {
  const write =
    (level: "log" | "warn" | "error") =>
    (msg: string, meta?: Record<string, unknown>) => {
      console[level](`[${scope}] ${msg}`, meta ?? "");
    };

  return {
    info: write("log"),
    warn: write("warn"),
    error: write("error"),
  };
}

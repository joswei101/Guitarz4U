type Level = "debug" | "info" | "warn" | "error";

/** Minimal structured JSON logger (stdout is collected by the hosting platform). */
function log(level: Level, message: string, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level === "debug") return;
  const entry = { level, time: new Date().toISOString(), message, ...context };
  const line = JSON.stringify(entry, (_k, v) => (v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v));
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (process.env.NODE_ENV !== "test") console.log(line);
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>) => log("debug", m, c),
  info: (m: string, c?: Record<string, unknown>) => log("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => log("warn", m, c),
  error: (m: string, c?: Record<string, unknown>) => log("error", m, c),
};

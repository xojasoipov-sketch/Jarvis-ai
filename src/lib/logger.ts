export type LogLevel = "info" | "warn" | "error" | "debug";
export type LogEntry = { id: number; ts: number; level: LogLevel; service: string; message: string };

const MAX = 200;
const logs: LogEntry[] = [];
let counter = 0;

export function log(level: LogLevel, service: string, message: string) {
  logs.unshift({ id: ++counter, ts: Date.now(), level, service, message });
  if (logs.length > MAX) logs.length = MAX;
}

export function getLogs(): LogEntry[] {
  return logs;
}

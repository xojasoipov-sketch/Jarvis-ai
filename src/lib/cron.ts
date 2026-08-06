/**
 * Lightweight 5-field cron parser.
 * Format: "minute hour day-of-month month day-of-week"
 * Supports: * , - /
 */

function parseField(field: string, min: number, max: number): Set<number> {
  const result = new Set<number>();

  for (const part of field.split(",")) {
    if (part === "*") {
      for (let i = min; i <= max; i++) result.add(i);
      continue;
    }

    // */step
    if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2), 10);
      for (let i = min; i <= max; i += step) result.add(i);
      continue;
    }

    // range/step or range
    if (part.includes("-")) {
      const [rangePart, stepPart] = part.split("/");
      const [lo, hi] = rangePart.split("-").map(Number);
      const step = stepPart ? parseInt(stepPart, 10) : 1;
      for (let i = lo; i <= hi; i += step) result.add(i);
      continue;
    }

    // exact value/step
    if (part.includes("/")) {
      const [start, step] = part.split("/").map(Number);
      for (let i = start; i <= max; i += step) result.add(i);
      continue;
    }

    result.add(parseInt(part, 10));
  }

  return result;
}

export interface CronFields {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;   // day of month
  month: Set<number>;
  dow: Set<number>;   // day of week (0=Sun, 6=Sat)
}

export function parseCron(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  try {
    return {
      minute: parseField(parts[0], 0, 59),
      hour:   parseField(parts[1], 0, 23),
      dom:    parseField(parts[2], 1, 31),
      month:  parseField(parts[3], 1, 12),
      dow:    parseField(parts[4], 0, 6),
    };
  } catch {
    return null;
  }
}

/** Returns true if the given Date matches the cron schedule (minute precision). */
export function matchesCron(expr: string, date: Date = new Date()): boolean {
  const fields = parseCron(expr);
  if (!fields) return false;

  return (
    fields.minute.has(date.getUTCMinutes()) &&
    fields.hour.has(date.getUTCHours()) &&
    fields.dom.has(date.getUTCDate()) &&
    fields.month.has(date.getUTCMonth() + 1) &&
    fields.dow.has(date.getUTCDay())
  );
}

/** Calculate next run time after `from` (default: now). Returns ISO string. */
export function nextRunAt(expr: string, from: Date = new Date()): string | null {
  const fields = parseCron(expr);
  if (!fields) return null;

  // Start from next minute
  const cursor = new Date(from);
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  // Search up to 1 year ahead
  const limit = new Date(cursor.getTime() + 366 * 24 * 60 * 60 * 1000);

  while (cursor < limit) {
    if (
      fields.month.has(cursor.getUTCMonth() + 1) &&
      fields.dom.has(cursor.getUTCDate()) &&
      fields.dow.has(cursor.getUTCDay()) &&
      fields.hour.has(cursor.getUTCHours()) &&
      fields.minute.has(cursor.getUTCMinutes())
    ) {
      return cursor.toISOString();
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }

  return null;
}

/** Human-readable cron description (Uzbek). */
export function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;

  const [min, hour, dom, month, dow] = parts;

  if (dom === "*" && month === "*" && dow === "*") {
    if (min !== "*" && hour !== "*") {
      return `Har kuni ${hour.padStart(2, "0")}:${min.padStart(2, "0")} da`;
    }
    if (min === "0" && hour === "*") return "Har soatda";
    if (min !== "*" && hour === "*") return `Har soatda ${min}-daqiqada`;
  }

  if (dom !== "*" && month === "*" && dow === "*") {
    if (min !== "*" && hour !== "*") {
      return `Har oy ${dom}-sanada ${hour.padStart(2, "0")}:${min.padStart(2, "0")} da`;
    }
  }

  if (dom === "*" && month === "*" && dow !== "*") {
    const days = ["Yak", "Du", "Se", "Cho", "Pay", "Ju", "Sha"];
    const dayName = days[parseInt(dow)] ?? dow;
    if (min !== "*" && hour !== "*") {
      return `Har ${dayName}shanbada ${hour.padStart(2, "0")}:${min.padStart(2, "0")} da`;
    }
  }

  return expr;
}

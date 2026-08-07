// Shaxsiy kotib — eslatmalar: tug'ilgan kunlar, muhim sanalar, dorilar, suv ichish va h.k.
import { supabase, dbConfigured } from "./supabase";
import { log } from "./logger";

export type ReminderCategory = "general" | "birthday" | "health" | "finance" | "travel";
export type ReminderRepeat = "none" | "daily" | "weekly" | "monthly" | "yearly";

export type Reminder = {
  id: string;
  title: string;
  note: string;
  category: ReminderCategory;
  due_at: string; // ISO
  repeat: ReminderRepeat;
  done: boolean;
  notified: boolean;
  created_at: string;
};

const mem: Reminder[] = [];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listReminders(opts?: { includeDone?: boolean }): Promise<Reminder[]> {
  if (dbConfigured && supabase) {
    let q = supabase.from("pari_reminders").select("*").order("due_at", { ascending: true });
    if (!opts?.includeDone) q = q.eq("done", false);
    const { data, error } = await q;
    if (error) log("error", "reminders", `listReminders: ${error.message}`);
    return data || [];
  }
  const rows = opts?.includeDone ? [...mem] : mem.filter((r) => !r.done);
  return rows.sort((a, b) => a.due_at.localeCompare(b.due_at));
}

export async function createReminder(input: {
  title: string;
  note?: string;
  category?: ReminderCategory;
  due_at: string;
  repeat?: ReminderRepeat;
}): Promise<Reminder> {
  const row: Reminder = {
    id: uid(),
    title: input.title,
    note: input.note || "",
    category: input.category || "general",
    due_at: input.due_at,
    repeat: input.repeat || "none",
    done: false,
    notified: false,
    created_at: new Date().toISOString(),
  };
  if (dbConfigured && supabase) {
    const { data, error } = await supabase.from("pari_reminders").insert(row).select().single();
    if (error) log("error", "reminders", `createReminder: ${error.message}`);
    return data || row;
  }
  mem.push(row);
  return row;
}

export async function completeReminder(id: string): Promise<Reminder | null> {
  if (dbConfigured && supabase) {
    const { data: current, error: getErr } = await supabase.from("pari_reminders").select("*").eq("id", id).single();
    if (getErr) log("error", "reminders", `completeReminder (read): ${getErr.message}`);
    if (!current) return null;
    if (current.repeat === "none") {
      const { data, error } = await supabase.from("pari_reminders").update({ done: true }).eq("id", id).select().single();
      if (error) log("error", "reminders", `completeReminder (write): ${error.message}`);
      return data;
    }
    // takrorlanuvchi eslatma — keyingi sanaga suriladi
    const next = nextDueDate(current.due_at, current.repeat);
    const { data, error } = await supabase.from("pari_reminders").update({ due_at: next, notified: false }).eq("id", id).select().single();
    if (error) log("error", "reminders", `completeReminder (reschedule): ${error.message}`);
    return data;
  }
  const r = mem.find((x) => x.id === id);
  if (!r) return null;
  if (r.repeat === "none") {
    r.done = true;
  } else {
    r.due_at = nextDueDate(r.due_at, r.repeat);
    r.notified = false;
  }
  return r;
}

export async function deleteReminder(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_reminders").delete().eq("id", id);
    if (error) log("error", "reminders", `deleteReminder: ${error.message}`);
    return;
  }
  const idx = mem.findIndex((r) => r.id === id);
  if (idx >= 0) mem.splice(idx, 1);
}

/** Muddati kelib, hali bildirilmagan eslatmalarni topadi (bot/cron uchun). */
export async function dueUnnotified(withinMs = 5 * 60 * 1000): Promise<Reminder[]> {
  const now = Date.now();
  const rows = await listReminders();
  return rows.filter((r) => !r.notified && new Date(r.due_at).getTime() <= now + withinMs);
}

export async function markNotified(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    const { error } = await supabase.from("pari_reminders").update({ notified: true }).eq("id", id);
    if (error) log("error", "reminders", `markNotified: ${error.message}`);
    return;
  }
  const r = mem.find((x) => x.id === id);
  if (r) r.notified = true;
}

function nextDueDate(dueAt: string, repeat: ReminderRepeat): string {
  const d = new Date(dueAt);
  switch (repeat) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString();
}

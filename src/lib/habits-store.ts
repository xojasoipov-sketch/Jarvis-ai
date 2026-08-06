// Hayot yordamchisi — kunlik odatlarni kuzatish (suv ichish, sport, uyqu, o'qish va h.k.)
import { supabase, dbConfigured } from "./supabase";

export type Habit = {
  id: string;
  title: string;
  emoji: string;
  target_days: string[]; // ["mon","tue",...]
  active: boolean;
  created_at: string;
};

export type HabitCheckin = {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  created_at: string;
};

const memHabits: Habit[] = [];
const memCheckins: HabitCheckin[] = [];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listHabits(): Promise<Habit[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_habits").select("*").eq("active", true).order("created_at", { ascending: false });
    return data || [];
  }
  return memHabits.filter((h) => h.active);
}

export async function createHabit(input: { title: string; emoji?: string; target_days?: string[] }): Promise<Habit> {
  const row: Habit = {
    id: uid(),
    title: input.title,
    emoji: input.emoji || "✅",
    target_days: input.target_days || ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    active: true,
    created_at: new Date().toISOString(),
  };
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_habits").insert(row).select().single();
    return data || row;
  }
  memHabits.push(row);
  return row;
}

export async function deleteHabit(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    await supabase.from("pari_habits").update({ active: false }).eq("id", id);
    return;
  }
  const h = memHabits.find((x) => x.id === id);
  if (h) h.active = false;
}

/** Bugungi kun uchun odatni bajarilgan/bajarilmagan deb belgilash. */
export async function checkinHabit(habitId: string, date = today(), done = true): Promise<HabitCheckin> {
  const row: HabitCheckin = { id: uid(), habit_id: habitId, date, done, created_at: new Date().toISOString() };
  if (dbConfigured && supabase) {
    const { data } = await supabase
      .from("pari_habit_checkins")
      .upsert(row, { onConflict: "habit_id,date" })
      .select()
      .single();
    return data || row;
  }
  const existing = memCheckins.find((c) => c.habit_id === habitId && c.date === date);
  if (existing) {
    existing.done = done;
    return existing;
  }
  memCheckins.push(row);
  return row;
}

export async function listCheckins(habitId: string, days = 30): Promise<HabitCheckin[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase
      .from("pari_habit_checkins")
      .select("*")
      .eq("habit_id", habitId)
      .order("date", { ascending: false })
      .limit(days);
    return data || [];
  }
  return memCheckins.filter((c) => c.habit_id === habitId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, days);
}

/** Ketma-ket necha kun bajarilgani (streak). */
export async function habitStreak(habitId: string): Promise<number> {
  const checkins = await listCheckins(habitId, 365);
  const doneDates = new Set(checkins.filter((c) => c.done).map((c) => c.date));
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (doneDates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// Uzoq muddatli xotira — foydalanuvchi haqidagi faktlar, afzalliklar, maqsadlar.
// Pari AI har suhbatda shu yerdan foydalanuvchini "eslab qoladi".
import { supabase, dbConfigured } from "./supabase";

export type MemoryCategory = "fact" | "preference" | "goal" | "date";

export type MemoryEntry = {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  importance: number; // 1..5
  created_at: string;
  updated_at: string;
};

const mem: MemoryEntry[] = [];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listMemory(category?: MemoryCategory): Promise<MemoryEntry[]> {
  if (dbConfigured && supabase) {
    let q = supabase.from("pari_memory").select("*").order("importance", { ascending: false });
    if (category) q = q.eq("category", category);
    const { data } = await q;
    return data || [];
  }
  const rows = category ? mem.filter((m) => m.category === category) : [...mem];
  return rows.sort((a, b) => b.importance - a.importance);
}

/** Fakt/afzallikni saqlaydi yoki mavjudini yangilaydi (key bo'yicha upsert). */
export async function rememberFact(input: {
  category: MemoryCategory;
  key: string;
  value: string;
  importance?: number;
}): Promise<MemoryEntry> {
  const now = new Date().toISOString();
  const importance = input.importance ?? 1;
  if (dbConfigured && supabase) {
    const { data } = await supabase
      .from("pari_memory")
      .upsert(
        { category: input.category, key: input.key, value: input.value, importance, updated_at: now },
        { onConflict: "category,key" }
      )
      .select()
      .single();
    return data;
  }
  const existing = mem.find((m) => m.category === input.category && m.key === input.key);
  if (existing) {
    existing.value = input.value;
    existing.importance = importance;
    existing.updated_at = now;
    return existing;
  }
  const row: MemoryEntry = { id: uid(), category: input.category, key: input.key, value: input.value, importance, created_at: now, updated_at: now };
  mem.push(row);
  return row;
}

export async function forgetFact(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    await supabase.from("pari_memory").delete().eq("id", id);
    return;
  }
  const idx = mem.findIndex((m) => m.id === id);
  if (idx >= 0) mem.splice(idx, 1);
}

/** Chat/agent promptga qo'shish uchun qisqa xotira xulosasi. */
export async function memorySummary(limit = 20): Promise<string> {
  const rows = await listMemory();
  if (!rows.length) return "";
  return rows
    .slice(0, limit)
    .map((r) => `- [${r.category}] ${r.key}: ${r.value}`)
    .join("\n");
}

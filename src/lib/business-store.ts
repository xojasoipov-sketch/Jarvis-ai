// Biznes modullari — Sadining monetizatsiya yo'nalishlari (in-memory + Supabase fallback)
import { supabase, dbConfigured } from "./supabase";

export type ModuleKey = "youtube" | "smm" | "courses" | "blogging" | "ai_tools";
export type ModuleStatus = "idea" | "active" | "paused";

export type BusinessModule = {
  id: string;
  module_key: ModuleKey;
  status: ModuleStatus;
  revenue: number;
  notes?: string;
  updated_at: string;
  created_at: string;
};

export type BusinessIdea = {
  id: string;
  module_key: ModuleKey;
  title: string;
  content: string;
  status: "draft" | "used" | "archived";
  created_at: string;
};

// Static module definitions — the 5 business lines
export const MODULE_DEFS: Record<ModuleKey, { name: string; icon: string; tagline: string; description: string }> = {
  youtube: {
    name: "Faceless YouTube",
    icon: "🎬",
    tagline: "Bir marta yarat, doim daromad ol",
    description: "AI orqali video skript yozish, ovoz yaratish va kanalni monetizatsiya qilish.",
  },
  smm: {
    name: "SMM Boshqaruvi",
    icon: "📱",
    tagline: "Aqlliroq boshqar, oyma-oy pul top",
    description: "Kontent yaratish, rejalashtirish va bir nechta kanal/mijozni boshqarish.",
  },
  courses: {
    name: "Onlayn Kurs Yaratish",
    icon: "🎓",
    tagline: "Bir marta o'qit, doim daromad ol",
    description: "AI yordamida kurs dasturi, darslar va marketing materiallarini yaratish.",
  },
  blogging: {
    name: "Blog va Affiliate Marketing",
    icon: "📝",
    tagline: "Bugun yoz, har kuni top",
    description: "SEO-optimallashtirilgan maqolalar va affiliate havolalar orqali passiv daromad.",
  },
  ai_tools: {
    name: "AI Vositalar va Shablonlar",
    icon: "🧰",
    tagline: "Bir marta yarat, abadiy sot",
    description: "Promptlar, shablonlar va AI vositalarini raqamli mahsulot sifatida sotish.",
  },
};

const memModules = new Map<ModuleKey, BusinessModule>();
const memIdeas: BusinessIdea[] = [];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export async function listModules(): Promise<BusinessModule[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_business_modules").select("*");
    const existing = new Map((data || []).map((m: BusinessModule) => [m.module_key, m]));
    return Object.keys(MODULE_DEFS).map((key) => {
      const k = key as ModuleKey;
      return existing.get(k) || {
        id: k, module_key: k, status: "idea" as ModuleStatus, revenue: 0,
        updated_at: new Date().toISOString(), created_at: new Date().toISOString(),
      };
    });
  }
  return Object.keys(MODULE_DEFS).map((key) => {
    const k = key as ModuleKey;
    return memModules.get(k) || {
      id: k, module_key: k, status: "idea" as ModuleStatus, revenue: 0,
      updated_at: new Date().toISOString(), created_at: new Date().toISOString(),
    };
  });
}

export async function updateModule(moduleKey: ModuleKey, patch: Partial<Pick<BusinessModule, "status" | "revenue" | "notes">>): Promise<void> {
  const payload = { ...patch, updated_at: new Date().toISOString() };
  if (dbConfigured && supabase) {
    await supabase.from("pari_business_modules").upsert(
      { module_key: moduleKey, ...payload },
      { onConflict: "module_key" }
    );
    return;
  }
  const current = memModules.get(moduleKey) || {
    id: moduleKey, module_key: moduleKey, status: "idea" as ModuleStatus, revenue: 0,
    updated_at: new Date().toISOString(), created_at: new Date().toISOString(),
  };
  memModules.set(moduleKey, { ...current, ...payload });
}

export async function listIdeas(moduleKey?: ModuleKey): Promise<BusinessIdea[]> {
  if (dbConfigured && supabase) {
    let q = supabase.from("pari_business_ideas").select("*").order("created_at", { ascending: false });
    if (moduleKey) q = q.eq("module_key", moduleKey);
    const { data } = await q;
    return data || [];
  }
  const ideas = moduleKey ? memIdeas.filter((i) => i.module_key === moduleKey) : [...memIdeas];
  return ideas.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createIdea(idea: Omit<BusinessIdea, "id" | "created_at">): Promise<BusinessIdea> {
  const row: BusinessIdea = { ...idea, id: uid(), created_at: new Date().toISOString() };
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_business_ideas").insert(row).select().single();
    return data || row;
  }
  memIdeas.unshift(row);
  return row;
}

export async function deleteIdea(id: string): Promise<void> {
  if (dbConfigured && supabase) {
    await supabase.from("pari_business_ideas").delete().eq("id", id);
    return;
  }
  const i = memIdeas.findIndex((x) => x.id === id);
  if (i !== -1) memIdeas.splice(i, 1);
}

export async function updateIdea(id: string, patch: Partial<BusinessIdea>): Promise<void> {
  if (dbConfigured && supabase) {
    await supabase.from("pari_business_ideas").update(patch).eq("id", id);
    return;
  }
  const i = memIdeas.findIndex((x) => x.id === id);
  if (i !== -1) Object.assign(memIdeas[i], patch);
}

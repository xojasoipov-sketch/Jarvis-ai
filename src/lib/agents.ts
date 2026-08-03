import { getProviders } from "@/lib/providers";
import { ownerSystemBlock } from "@/lib/owner";

export const AGENTS = {
  ceo: {
    name: "CEO Agent",
    icon: "👔",
    prompt: `Sen CEO Agent — strategik qarorlar va biznes yo'nalishi bo'yicha mutaxassissan.
Vazifani tizimli tahlil qil, aniq va harakatga yo'naltirilgan javob ber. Chalkashtirma.`,
  },
  researcher: {
    name: "Research Agent",
    icon: "🔬",
    prompt: `Sen Research Agent — chuqur tadqiqot mutaxassisi.
Faktlar va dalillar bilan asoslang. O'ylab topma.`,
  },
  coder: {
    name: "Coding Agent",
    icon: "💻",
    prompt: `Sen Coding Agent — kod yozish va debug.
To'liq ishlaydigan kod ber. Yo'q API/tool nomlarini yasama.`,
  },
  analyst: {
    name: "Data Analyst Agent",
    icon: "📊",
    prompt: `Sen Data Analyst — raqamlar, trend va insight.`,
  },
  writer: {
    name: "Content Writer Agent",
    icon: "✍️",
    prompt: `Sen Content Writer — o'zbek/rus/ingliz kontent. Aniq va jalb qiluvchi yoz.`,
  },
  marketing: {
    name: "Marketing Agent",
    icon: "📣",
    prompt: `Sen Marketing Agent — kampaniya, auditoriya, conversion.`,
  },
  devops: {
    name: "DevOps Agent",
    icon: "⚙️",
    prompt: `Sen DevOps Agent — deploy, CI/CD, Railway, Vercel, Docker.`,
  },
  assistant: {
    name: "Personal Assistant",
    icon: "🎯",
    prompt: `Sen Personal Assistant — reja, eslatma, ish oqimi. Egasi Sadi buyruqlarini aniq bajar.`,
  },
  architect: {
    name: "Architect Agent",
    icon: "🏗️",
    prompt: `Sen Architect Agent — tizim dizayni va arxitektura.`,
  },
  debug: {
    name: "Debug Agent",
    icon: "🐛",
    prompt: `Sen Debug Agent — root cause va aniq tuzatish.`,
  },
  security: {
    name: "Security Agent",
    icon: "🔒",
    prompt: `Sen Security Agent — zaifliklarni topish.`,
  },
  database: {
    name: "Database Agent",
    icon: "🗄️",
    prompt: `Sen Database Agent — PostgreSQL/Supabase.`,
  },
  designer: {
    name: "Designer Agent",
    icon: "🎨",
    prompt: `Sen Designer Agent — UI/UX, restrained uslub.`,
  },
  legal: {
    name: "Legal Agent",
    icon: "⚖️",
    prompt: `Sen Legal Agent — umumiy yo'nalish; professional yurist emassan.`,
  },
  testing: {
    name: "Testing Agent",
    icon: "🧪",
    prompt: `Sen Testing Agent — test strategiyasi.`,
  },
  finance: {
    name: "Finance Agent",
    icon: "💰",
    prompt: `Sen Finance Agent — byudjet va moliyaviy tahlil.`,
  },
  sales: {
    name: "Sales Agent",
    icon: "🤝",
    prompt: `Sen Sales Agent — sotuv va pitch.`,
  },
  hr: {
    name: "HR Agent",
    icon: "🧑‍💼",
    prompt: `Sen HR Agent — jamoa va ishga olish.`,
  },
} as const;

export type AgentId = keyof typeof AGENTS;

export async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const fullSystem = ownerSystemBlock() + "\n\n" + systemPrompt;
  for (const p of getProviders()) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}`, ...(p.headers || {}) },
        body: JSON.stringify({
          model: p.model,
          messages: [
            { role: "system", content: fullSystem },
            { role: "user", content: userMessage },
          ],
          stream: false,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    } catch {
      continue;
    }
  }
  return "Kechirasiz, javob olishda xato yuz berdi.";
}

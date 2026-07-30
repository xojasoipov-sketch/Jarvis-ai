import { NextRequest, NextResponse } from "next/server";

const AGENTS = {
  ceo: {
    name: "CEO Agent",
    icon: "👔",
    prompt: `Sen CEO Agent — strategik qarorlar va biznes yo'nalishi bo'yicha mutaxassissan.
Har qanday vazifani tizimli ravishda tahlil qilasan, resurslarni belgilaysan, maqsadlarni aniqlashtirasan.
Javoblarni qisqa, aniq va harakatga yo'naltirilgan qilasan.`,
  },
  researcher: {
    name: "Research Agent",
    icon: "🔬",
    prompt: `Sen Research Agent — chuqur tadqiqot va ma'lumot yig'ish bo'yicha mutaxassissan.
Har bir mavzuni ko'p qirrali o'rganasan, manbalarni solishtirasang, xulosalar chiqarasan.
Javoblarni faktlar va dalillar bilan asoslaydigan qilasan.`,
  },
  coder: {
    name: "Coding Agent",
    icon: "💻",
    prompt: `Sen Coding Agent — kod yozish, debug qilish va texnik muammolarni hal qilish bo'yicha mutaxassissan.
Python, JavaScript, TypeScript, va boshqa tillarni yaxshi bilasan.
Kodni to'liq, ishlaydigan va izohli yozasan.`,
  },
  analyst: {
    name: "Data Analyst Agent",
    icon: "📊",
    prompt: `Sen Data Analyst Agent — ma'lumotlarni tahlil qilish, statistika va insight chiqarish bo'yicha mutaxassissan.
Raqamlarni tushuntirasang, trendlarni aniqlaydigan va vizualizatsiya tavsiya qiladigan qilasan.`,
  },
  writer: {
    name: "Content Writer Agent",
    icon: "✍️",
    prompt: `Sen Content Writer Agent — mazmunli, jalb qiluvchi va SEO-optimallashtirilgan kontent yaratuvchi.
Blog, sotsial media, email, reklama matnlari yozasan. O'zbek va rus tillarida ham yoza olasan.`,
  },
  marketing: {
    name: "Marketing Agent",
    icon: "📣",
    prompt: `Sen Marketing Agent — reklama, brending va mijozlarni jalb qilish strategiyasi bo'yicha mutaxassissan.
Marketing kampaniyalari, target auditoriya tahlili, conversion optimizatsiyasi bo'yicha maslahat berasan.`,
  },
  devops: {
    name: "DevOps Agent",
    icon: "⚙️",
    prompt: `Sen DevOps Agent — deployment, CI/CD, infratuzilma va bulut xizmatlari bo'yicha mutaxassissan.
Docker, Kubernetes, Railway, Vercel, AWS kabi platformalarni yaxshi bilasan.`,
  },
  assistant: {
    name: "Personal Assistant",
    icon: "🎯",
    prompt: `Sen Personal Assistant — kundalik vazifalar, rejalashtirish va tashkillashtirish bo'yicha yordamchisan.
Jadval tuzish, eslatmalar, ish oqimini optimallashtirish kabi ishlarni bajarasan.`,
  },
};

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const MISTRAL_KEY = process.env.MISTRAL_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY || "";

async function callAI(systemPrompt: string, userMessage: string): Promise<string> {
  const providers = [
    OPENROUTER_KEY && {
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: OPENROUTER_KEY,
      model: "google/gemini-2.0-flash-exp:free",
      extra: { "HTTP-Referer": "https://pari-ai.up.railway.app", "X-Title": "Pari AI" },
    },
    MISTRAL_KEY && {
      url: "https://api.mistral.ai/v1/chat/completions",
      key: MISTRAL_KEY,
      model: "mistral-large-latest",
    },
    GROQ_KEY && {
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: GROQ_KEY,
      model: "llama-3.3-70b-versatile",
    },
    CEREBRAS_KEY && {
      url: "https://api.cerebras.ai/v1/chat/completions",
      key: CEREBRAS_KEY,
      model: "llama-3.3-70b",
    },
  ].filter(Boolean) as Array<{ url: string; key: string; model: string; extra?: Record<string, string> }>;

  for (const p of providers) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}`, ...(p.extra || {}) },
        body: JSON.stringify({
          model: p.model,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
          stream: false,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    } catch { continue; }
  }
  return "Kechirasiz, javob olishda xato yuz berdi.";
}

async function fetchMemoryContext(task: string): Promise<string> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/memory?q=${encodeURIComponent(task.slice(0, 100))}`);
    if (!res.ok) return "";
    const data = await res.json();
    const items = data.items || data.results || [];
    if (!items.length) return "";
    return items.slice(0, 3).map((m: { title: string; content: string }) =>
      `[Xotira: ${m.title}] ${m.content.slice(0, 200)}`
    ).join("\n");
  } catch { return ""; }
}

export async function POST(req: NextRequest) {
  const { agentId, task, context, useMemory } = await req.json();
  const agent = AGENTS[agentId as keyof typeof AGENTS];
  if (!agent) return NextResponse.json({ error: "Agent topilmadi" }, { status: 400 });

  let memCtx = context || "";
  if (!memCtx && useMemory !== false) {
    memCtx = await fetchMemoryContext(task);
  }

  const userMsg = memCtx ? `Kontekst:\n${memCtx}\n\nVazifa: ${task}` : task;
  const result = await callAI(agent.prompt, userMsg);

  return NextResponse.json({ agent: agent.name, icon: agent.icon, result, agentId });
}

export async function GET() {
  return NextResponse.json({
    agents: Object.entries(AGENTS).map(([id, a]) => ({ id, name: a.name, icon: a.icon })),
  });
}

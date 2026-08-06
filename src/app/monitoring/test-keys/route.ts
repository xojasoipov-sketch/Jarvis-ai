import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type KeyResult = { key: string; status: "ok" | "fail" | "no_key"; detail?: string };

// ─── Groq ──────────────────────────────────────────────────────────────────
async function testGroq(name: string, val: string): Promise<KeyResult> {
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${val}` },
      body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 429) return { key: name, status: "fail", detail: "rate_limit/quota" };
    if (r.status === 401) return { key: name, status: "fail", detail: "invalid_key" };
    if (!r.ok) return { key: name, status: "fail", detail: `http_${r.status}` };
    return { key: name, status: "ok" };
  } catch { return { key: name, status: "fail", detail: "timeout" }; }
}

// ─── Gemini ────────────────────────────────────────────────────────────────
async function testGemini(name: string, val: string): Promise<KeyResult> {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${val}`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }], generationConfig: { maxOutputTokens: 1 } }),
        signal: AbortSignal.timeout(8000) }
    );
    if (r.status === 429) return { key: name, status: "fail", detail: "quota_exceeded" };
    if (r.status === 400) return { key: name, status: "fail", detail: "invalid_key" };
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      const d = t.includes("quota") ? "quota_exceeded" : `http_${r.status}`;
      return { key: name, status: "fail", detail: d };
    }
    return { key: name, status: "ok" };
  } catch { return { key: name, status: "fail", detail: "timeout" }; }
}

// ─── OpenRouter ────────────────────────────────────────────────────────────
async function testOpenRouter(name: string, val: string): Promise<KeyResult> {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${val}` },
      body: JSON.stringify({ model: "openai/gpt-4o-mini", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 402) return { key: name, status: "fail", detail: "no_credits" };
    if (r.status === 401) return { key: name, status: "fail", detail: "invalid_key" };
    if (!r.ok) return { key: name, status: "fail", detail: `http_${r.status}` };
    return { key: name, status: "ok" };
  } catch { return { key: name, status: "fail", detail: "timeout" }; }
}

// ─── Mistral ───────────────────────────────────────────────────────────────
async function testMistral(name: string, val: string): Promise<KeyResult> {
  try {
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${val}` },
      body: JSON.stringify({ model: "mistral-small-latest", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 429) return { key: name, status: "fail", detail: "rate_limit/quota" };
    if (r.status === 401) return { key: name, status: "fail", detail: "invalid_key" };
    if (!r.ok) return { key: name, status: "fail", detail: `http_${r.status}` };
    return { key: name, status: "ok" };
  } catch { return { key: name, status: "fail", detail: "timeout" }; }
}

// ─── Cerebras ──────────────────────────────────────────────────────────────
async function testCerebras(name: string, val: string): Promise<KeyResult> {
  try {
    const r = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${val}` },
      body: JSON.stringify({ model: "llama3.1-8b", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 429) return { key: name, status: "fail", detail: "rate_limit/quota" };
    if (r.status === 401) return { key: name, status: "fail", detail: "invalid_key" };
    if (!r.ok) return { key: name, status: "fail", detail: `http_${r.status}` };
    return { key: name, status: "ok" };
  } catch { return { key: name, status: "fail", detail: "timeout" }; }
}

// ─── DeepSeek ──────────────────────────────────────────────────────────────
async function testDeepSeek(name: string, val: string): Promise<KeyResult> {
  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${val}` },
      body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 402) return { key: name, status: "fail", detail: "insufficient_balance" };
    if (r.status === 401) return { key: name, status: "fail", detail: "invalid_key" };
    if (!r.ok) return { key: name, status: "fail", detail: `http_${r.status}` };
    return { key: name, status: "ok" };
  } catch { return { key: name, status: "fail", detail: "timeout" }; }
}

// ─── Moonshot ──────────────────────────────────────────────────────────────
async function testMoonshot(name: string, val: string): Promise<KeyResult> {
  try {
    const r = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${val}` },
      body: JSON.stringify({ model: "moonshot-v1-8k", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 429) return { key: name, status: "fail", detail: "rate_limit/quota" };
    if (r.status === 401) return { key: name, status: "fail", detail: "invalid_key" };
    if (!r.ok) return { key: name, status: "fail", detail: `http_${r.status}` };
    return { key: name, status: "ok" };
  } catch { return { key: name, status: "fail", detail: "timeout" }; }
}

// ─── OpenAI ────────────────────────────────────────────────────────────────
async function testOpenAI(name: string, val: string): Promise<KeyResult> {
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${val}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 429) return { key: name, status: "fail", detail: "quota_exceeded" };
    if (r.status === 401) return { key: name, status: "fail", detail: "invalid_key" };
    if (!r.ok) return { key: name, status: "fail", detail: `http_${r.status}` };
    return { key: name, status: "ok" };
  } catch { return { key: name, status: "fail", detail: "timeout" }; }
}

function env(name: string) { return process.env[name] || ""; }

export async function GET() {
  const tasks: Promise<KeyResult>[] = [];

  // Groq
  for (const n of ["GROQ_API_KEY", "GROQ_API_KEY2"]) {
    const v = env(n); tasks.push(v ? testGroq(n, v) : Promise.resolve({ key: n, status: "no_key" as const }));
  }
  // Gemini
  for (const n of ["GEMINI_API_KEY", "GEMINI_API_KEY2", "GEMINI_API_KEY3"]) {
    const v = env(n); tasks.push(v ? testGemini(n, v) : Promise.resolve({ key: n, status: "no_key" as const }));
  }
  // OpenRouter
  for (const n of ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY2"]) {
    const v = env(n); tasks.push(v ? testOpenRouter(n, v) : Promise.resolve({ key: n, status: "no_key" as const }));
  }
  // Mistral
  for (const n of ["MISTRAL_API_KEY","MISTRAL_API_KEY2","MISTRAL_API_KEY3","MISTRAL_API_KEY4","MISTRAL_API_KEY5","MISTRAL_API_KEY6"]) {
    const v = env(n); tasks.push(v ? testMistral(n, v) : Promise.resolve({ key: n, status: "no_key" as const }));
  }
  // Cerebras
  for (const n of ["CEREBRAS_API_KEY","CEREBRAS_API_KEY2","CEREBRAS_API_KEY3","CEREBRAS_API_KEY4","CEREBRAS_API_KEY5"]) {
    const v = env(n); tasks.push(v ? testCerebras(n, v) : Promise.resolve({ key: n, status: "no_key" as const }));
  }
  // DeepSeek
  for (const n of ["DEEPSEEK_API_KEY","DEEPSEEK_API_KEY2","DEEPSEEK_API_KEY3","DEEPSEEK_API_KEY4"]) {
    const v = env(n); tasks.push(v ? testDeepSeek(n, v) : Promise.resolve({ key: n, status: "no_key" as const }));
  }
  // Moonshot
  for (const n of ["MOONSHOT_API_KEY","MOONSHOT_API_KEY2","MOONSHOT_API_KEY3","MOONSHOT_API_KEY4"]) {
    const v = env(n); tasks.push(v ? testMoonshot(n, v) : Promise.resolve({ key: n, status: "no_key" as const }));
  }
  // OpenAI
  for (const n of ["OPENAI_API_KEY","OPENAI_API_KEY2","OPENAI_API_KEY3","OPENAI_API_KEY4"]) {
    const v = env(n); tasks.push(v ? testOpenAI(n, v) : Promise.resolve({ key: n, status: "no_key" as const }));
  }

  const results = await Promise.all(tasks);

  const ok   = results.filter(r => r.status === "ok").map(r => r.key);
  const fail = results.filter(r => r.status === "fail");
  const none = results.filter(r => r.status === "no_key").map(r => r.key);

  return NextResponse.json({ ok, fail, no_key: none, total: results.length, ts: new Date().toISOString() });
}

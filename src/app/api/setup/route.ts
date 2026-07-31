import { NextResponse } from "next/server";
import { dbConfigured, supabase } from "@/lib/supabase";
import { vaultConfigured } from "@/lib/githubVault";

// GET /api/setup — diagnostika: barcha integratsiyalar holati
export async function GET() {
  const checks: Record<string, { ok: boolean; detail: string }> = {};

  // ── Supabase ──────────────────────────────────────────────────────────────
  if (!dbConfigured) {
    checks.supabase = { ok: false, detail: "SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY yo'q" };
  } else {
    try {
      const { error } = await supabase!.from("pari_tasks").select("id").limit(1);
      if (error) {
        checks.supabase = {
          ok: false,
          detail: error.message.includes("does not exist")
            ? "Jadvallar topilmadi — supabase/migrations/001_init.sql ni SQL Editor'ga ishga tushiring"
            : error.message,
        };
      } else {
        checks.supabase = { ok: true, detail: "Ulandi, jadvallar mavjud" };
      }
    } catch (e) {
      checks.supabase = { ok: false, detail: String(e) };
    }
  }

  // ── GitHub Vault ──────────────────────────────────────────────────────────
  if (!vaultConfigured) {
    checks.github_vault = {
      ok: false,
      detail: "GITHUB_TOKEN (yoki GITHUB_PERSONAL_ACCESS_TOKEN) yoki GITHUB_VAULT_REPO yo'q",
    };
  } else {
    try {
      const repo = process.env.GITHUB_VAULT_REPO || process.env.GITHUB_REPOSITORY || "";
      const token =
        process.env.GITHUB_TOKEN ||
        process.env.GITHUB_PERSONAL_ACCESS_TOKEN ||
        process.env.GH_TOKEN ||
        "";
      const branch = process.env.GITHUB_VAULT_BRANCH || "main";
      const root = (process.env.GITHUB_VAULT_PATH || "vault").replace(/^\/|\/$/g, "");
      const res = await fetch(
        `https://api.github.com/repos/${repo}/contents/${root}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(6000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : 1;
        checks.github_vault = { ok: true, detail: `Ulandi — ${repo}/${root} (${count} ta fayl)` };
      } else {
        const msg = await res.text().catch(() => res.statusText);
        checks.github_vault = { ok: false, detail: `GitHub API ${res.status}: ${msg.slice(0, 120)}` };
      }
    } catch (e) {
      checks.github_vault = { ok: false, detail: String(e) };
    }
  }

  // ── Telegram ──────────────────────────────────────────────────────────────
  const tgToken = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!tgToken) {
    checks.telegram = { ok: false, detail: "TELEGRAM_BOT_TOKEN yo'q" };
  } else {
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await res.json();
      if (data.ok) {
        checks.telegram = { ok: true, detail: `Bot: @${data.result.username} (${data.result.first_name})` };
      } else {
        checks.telegram = { ok: false, detail: data.description || "Noto'g'ri token" };
      }
    } catch (e) {
      checks.telegram = { ok: false, detail: String(e) };
    }
  }

  // ── Gemini (STT) ─────────────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (!geminiKey) {
    checks.gemini = { ok: false, detail: "GEMINI_API_KEY yo'q — aistudio.google.com dan oling" };
  } else if (!geminiKey.startsWith("AIza")) {
    checks.gemini = { ok: false, detail: "Key noto'g'ri format — AIzaSy... bilan boshlanishi kerak" };
  } else {
    checks.gemini = { ok: true, detail: `Key mavjud (${geminiKey.slice(0, 8)}...)` };
  }

  // ── Groq ─────────────────────────────────────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY || "";
  checks.groq = groqKey
    ? { ok: true, detail: `Key mavjud (${groqKey.slice(0, 10)}...)` }
    : { ok: false, detail: "GROQ_API_KEY yo'q (ixtiyoriy — Whisper STT uchun)" };

  const allOk = Object.values(checks).filter((c) => !c.ok).length === 0;

  return NextResponse.json({
    status: allOk ? "✅ Hammasi ulangan" : "⚠️ Ba'zi integratsiyalar sozlanmagan",
    checks,
    railway_variables_needed: [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "GITHUB_TOKEN  (yoki GITHUB_PERSONAL_ACCESS_TOKEN)",
      "GITHUB_VAULT_REPO  (masalan: xojasoipov-sketch/Jarvis-ai)",
      "TELEGRAM_BOT_TOKEN",
      "GEMINI_API_KEY  (AIzaSy... format)",
    ],
  });
}

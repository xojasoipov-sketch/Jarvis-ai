import { NextRequest, NextResponse } from "next/server";
import { listSkills, routeSkill, skillSystemPrompt, skillOutputPath, todayStamp } from "@/lib/skills";
import { getProviders } from "@/lib/providers";
import { vaultConfigured, searchVault, writeVaultFile } from "@/lib/githubVault";

export const runtime = "nodejs";
export const maxDuration = 60;

async function llm(system: string, user: string): Promise<string> {
  const providers = getProviders().filter((p) => p.key && p.key !== "dummy");
  const errors: string[] = [];

  for (const p of providers.slice(0, 6)) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.key}`,
          ...(p.headers || {}),
        },
        body: JSON.stringify({
          model: p.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.4,
          max_tokens: 1200,
        }),
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        errors.push(`${p.name}:${res.status}`);
        continue;
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      errors.push(`${p.name}:empty`);
    } catch (e) {
      errors.push(`${p.name}:${e instanceof Error ? e.message : "err"}`);
    }
  }

  // deterministic fallback so HUD still works offline
  return [
    `Skill ishladi (LLM vaqtincha yo'q: ${errors.slice(0, 3).join(", ") || "no provider"}).`,
    "",
    `## ${todayStamp()}`,
    user.slice(0, 400),
    "",
    "_Keyinroq provider kalitlarini sozlang — javob boyiydi._",
  ].join("\n");
}

export async function GET() {
  return NextResponse.json({
    loop: ["speak", "route", "execute", "remember", "repeat"],
    skills: listSkills().map((s) => ({
      name: s.name,
      description: s.description,
      triggers: s.triggers,
    })),
    vault: vaultConfigured,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || body.message || body.q || "").trim();
  const force = body.skill ? String(body.skill) : "";
  const remember = body.remember !== false;

  if (!text && !force) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const skill =
    (force && listSkills().find((s) => s.name === force)) || routeSkill(text) || listSkills().find((s) => s.name === "vault");

  if (!skill) {
    return NextResponse.json({ error: "no skill" }, { status: 400 });
  }

  let vaultContext = "";
  if (vaultConfigured && text) {
    try {
      const hits = await searchVault(text.slice(0, 80));
      vaultContext = hits.map((h) => `[[${h.path}]] ${h.excerpt}`).join("\n");
    } catch {
      /* optional */
    }
  }

  const system = skillSystemPrompt(skill, vaultContext);
  const answer = await llm(system, text || skill.name);

  let saved: string | null = null;
  if (remember && vaultConfigured) {
    const rel = skillOutputPath(skill);
    const md = `# ${skill.name} — ${todayStamp()}\n\n> input: ${text}\n\n${answer}\n`;
    try {
      const ok = await writeVaultFile(rel, md, `skill(${skill.name}): ${todayStamp()}`);
      if (ok) saved = `vault/${rel}`;
    } catch {
      saved = null;
    }
  }

  return NextResponse.json({
    ok: true,
    skill: skill.name,
    answer,
    saved,
    loop: "speak → route → execute → remember",
  });
}

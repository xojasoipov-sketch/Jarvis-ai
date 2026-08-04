/**
 * Pari skill router — Speak → Route → Execute → Remember
 * Each skill = skills/<name>/SKILL.md (small, single-purpose)
 */

export type SkillMeta = {
  name: string;
  description: string;
  triggers: string[];
  body: string;
};

const BUILTIN: SkillMeta[] = [
  {
    name: "metrics",
    description: "Pull key numbers — tasks, health, focus",
    triggers: ["metrics", "raqamlar", "statistika", "kpi", "numbers", "holat"],
    body: "Return short status: system, focus, one recommendation. Uzbek.",
  },
  {
    name: "inbox",
    description: "Morning brief",
    triggers: ["inbox", "brief", "ertalab", "morning", "yangilik", "brifing"],
    body: "Morning brief: top 3, open loops, one risk, one opportunity. Uzbek.",
  },
  {
    name: "trends",
    description: "What is moving",
    triggers: ["trends", "trend", "nima trend", "scan", "bozor"],
    body: "3-5 actionable trends for SADIPRIME / AI / Telegram Mini Apps. Uzbek.",
  },
  {
    name: "plan",
    description: "Plan today top 3",
    triggers: ["plan", "reja", "today", "bugun", "priorit", "top 3"],
    body: "Output Top 3 priorities + morning/afternoon/evening cues. Uzbek.",
  },
  {
    name: "vault",
    description: "Memory read/write",
    triggers: ["esla", "eslab", "vault", "memory", "xotira", "yozib", "eslab qol"],
    body: "Search or save memory. Confirm what was stored.",
  },
  {
    name: "reflect",
    description: "Close the day",
    triggers: ["reflect", "reflection", "yopish", "kechki", "close", "kun yakuni"],
    body: "Shipped / slipped / lesson / tomorrow #1. Uzbek.",
  },
];

export function listSkills(): SkillMeta[] {
  return BUILTIN;
}

/** Route free text to the best skill (or null for general chat). */
export function routeSkill(text: string): SkillMeta | null {
  const t = text.toLowerCase().trim();
  if (!t) return null;

  let best: SkillMeta | null = null;
  let bestScore = 0;

  for (const skill of BUILTIN) {
    let score = 0;
    for (const trig of skill.triggers) {
      if (t.includes(trig.toLowerCase())) score += trig.length;
    }
    // exact command style: /plan /metrics
    if (t.startsWith("/" + skill.name) || t.startsWith(skill.name + " ")) score += 20;
    if (score > bestScore) {
      bestScore = score;
      best = skill;
    }
  }

  return bestScore > 0 ? best : null;
}

export function skillSystemPrompt(skill: SkillMeta, vaultContext = ""): string {
  return [
    `Siz Pari AI skill ijrochisisiz. Skill: ${skill.name}.`,
    skill.description,
    skill.body,
    "Qoida: qisqa, aniq, amaliy. Kerak bo'lsa markdown.",
    vaultContext ? `Vault kontekst:\n${vaultContext.slice(0, 3000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export function skillOutputPath(skill: SkillMeta): string {
  const d = todayStamp();
  if (skill.name === "plan") return `daily/${d}-plan.md`;
  if (skill.name === "inbox") return `daily/${d}-brief.md`;
  if (skill.name === "reflect") return `daily/${d}-reflection.md`;
  if (skill.name === "metrics") return `outputs/metrics-${d}.md`;
  return `raw/${d}-${skill.name}.md`;
}

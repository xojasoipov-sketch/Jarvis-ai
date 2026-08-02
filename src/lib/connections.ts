import { getProviders } from "@/lib/providers";
import { dbConfigured } from "@/lib/supabase";
import { listMcpTools, listMcpServers, getAllTools } from "@/lib/mcp-tools";
import { vaultConfigured } from "@/lib/githubVault";
import { repoConfigured } from "@/lib/githubRepo";
import { ENV, envAny } from "@/lib/env";

export type ConnectionItem = {
  id: string;
  name: string;
  ok: boolean;
  detail: string;
  category: string;
  env_hint?: string[];
};

export function getConnectionsSnapshot(): ConnectionItem[] {
  const items: ConnectionItem[] = [];

  for (const p of getProviders()) {
    if (p.name === "pollinations") {
      items.push({
        id: "pollinations",
        name: "Pollinations LLM",
        ok: true,
        detail: "Bepul text (key shart emas)",
        category: "llm",
      });
      continue;
    }
    if (!p.key || p.key === "dummy") continue;
    items.push({
      id: p.name,
      name: `LLM: ${p.name}`,
      ok: true,
      detail: `${p.model}${p.supportsTools ? " | tools YES" : ""}`,
      category: "llm",
    });
  }

  items.push({
    id: "supabase",
    name: "Supabase",
    ok: dbConfigured,
    detail: dbConfigured
      ? "Ulangan — tasks, knowledge, projects"
      : "URL yoki KEY topilmadi",
    category: "data",
    env_hint: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  });

  const tg = Boolean(ENV.telegram());
  items.push({
    id: "telegram",
    name: "Telegram Bot",
    ok: tg,
    detail: tg ? "TELEGRAM_BOT_TOKEN bor" : "Token topilmadi",
    category: "messaging",
    env_hint: ["TELEGRAM_BOT_TOKEN"],
  });

  const gh = Boolean(ENV.github());
  items.push({
    id: "github",
    name: "GitHub",
    ok: gh || repoConfigured,
    detail: gh ? "Token bor — PR + vault" : "GITHUB_TOKEN topilmadi",
    category: "code",
    env_hint: ["GITHUB_TOKEN", "GITHUB_PERSONAL_ACCESS_TOKEN"],
  });

  items.push({
    id: "obsidian_vault",
    name: "Obsidian Vault",
    ok: vaultConfigured,
    detail: vaultConfigured
      ? "GitHub vault orqali create_file/read_file/vault_*"
      : "GitHub token kerak",
    category: "knowledge",
  });

  items.push({
    id: "hermes",
    name: "Hermes orchestrator",
    ok: true,
    detail: "/api/hermes — multi-agent (built-in)",
    category: "agents",
  });

  items.push({
    id: "railway",
    name: "Railway deploy",
    ok: envAny("RAILWAY_ENVIRONMENT", "RAILWAY_ENVIRONMENT_NAME", "RAILWAY_PUBLIC_DOMAIN", "RAILWAY_PROJECT_ID"),
    detail: envAny("RAILWAY_PUBLIC_DOMAIN")
      ? `Domain: ${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : envAny("RAILWAY_ENVIRONMENT_NAME", "RAILWAY_ENVIRONMENT")
        ? "Railway muhitida ishlayapti"
        : "Local yoki Railway env ko'rinmayapti",
    category: "infra",
  });

  items.push({
    id: "internet",
    name: "Internet",
    ok: true,
    detail: "web_search, web_fetch, extract_* (server-side)",
    category: "internet",
  });

  items.push({
    id: "groq",
    name: "Groq (tool-calling)",
    ok: Boolean(ENV.groq()),
    detail: ENV.groq() ? "Tool loop ishlaydi" : "GROQ_API_KEY yo'q — tool chaqirish zaif",
    category: "llm",
    env_hint: ["GROQ_API_KEY"],
  });

  items.push({
    id: "gemini",
    name: "Gemini",
    ok: Boolean(ENV.gemini()),
    detail: ENV.gemini() ? "Key bor" : "GEMINI_API_KEY yo'q",
    category: "llm",
  });

  items.push({
    id: "elevenlabs",
    name: "ElevenLabs",
    ok: Boolean(ENV.elevenlabs()),
    detail: ENV.elevenlabs() ? "TTS/STT" : "yo'q",
    category: "voice",
  });

  const mcp = listMcpTools();
  const servers = listMcpServers();
  items.push({
    id: "mcp",
    name: "MCP",
    ok: mcp.length > 0 || servers.length > 0,
    detail:
      mcp.length || servers.length
        ? `tools=${mcp.map((t) => t.name).join(",") || "-"} servers=${servers.map((s) => s.name).join(",") || "-"}`
        : "MCP_TOOLS_JSON / MCP_SERVERS_JSON bo'sh",
    category: "mcp",
  });

  return items;
}

export function buildBrainContext(): string {
  const snap = getConnectionsSnapshot();
  const tools = getAllTools().map((t) => t.name);
  const ok = snap.filter((c) => c.ok);
  const bad = snap.filter((c) => !c.ok);

  return [
    "# HAQIQIY TIZIM HOLATI (o'ylab chiqarma — faqat shu)",
    "",
    "## ✅ ULANGBAN",
    ...ok.map((c) => `- ${c.name}: ${c.detail}`),
    "",
    "## ❌ ULANMAGAN",
    ...(bad.length ? bad.map((c) => `- ${c.name}: ${c.detail}`) : ["- (yo'q)"]),
    "",
    "## TOOL LAR (faqat shular — list_service_orders kabi o'ylab topma)",
    tools.join(", "),
    "",
    "Agar foydalanuvchi tool/ulanish so'rasa — yuqoridagi ro'yxatni ayt yoki list_connections.",
  ].join("\n");
}

export function connectionsSummaryJson() {
  const snap = getConnectionsSnapshot();
  return {
    connected: snap.filter((c) => c.ok).map((c) => ({
      id: c.id,
      name: c.name,
      detail: c.detail,
      category: c.category,
    })),
    disconnected: snap.filter((c) => !c.ok).map((c) => ({
      id: c.id,
      name: c.name,
      detail: c.detail,
      env_hint: c.env_hint,
    })),
    tools: getAllTools().map((t) => ({ name: t.name, description: t.description.slice(0, 120) })),
    mcp_tools: listMcpTools(),
    mcp_servers: listMcpServers(),
  };
}

/** Human-readable answer — no LLM needed */
export function formatConnectionsReport(): string {
  const s = connectionsSummaryJson();
  const lines: string[] = [
    "## Hozir haqiqatan ulangan (server process.env)",
    "",
  ];
  if (s.connected.length) {
    for (const c of s.connected) {
      lines.push(`✅ **${c.name}** — ${c.detail}`);
    }
  } else {
    lines.push("(hech narsa ulanmagan deb ko'rinadi)");
  }
  lines.push("", "## Ulanmagan");
  for (const c of s.disconnected) {
    lines.push(
      `❌ **${c.name}** — ${c.detail}` +
        (c.env_hint?.length ? ` (Railway: ${c.env_hint.join(" yoki ")})` : "")
    );
  }
  lines.push("", "## Mavjud tool lar");
  lines.push(s.tools.map((t) => `
- 
${t.name}
`).join("") || s.tools.map((t) => `- 
${t.name}: ${t.description}`).join("\n"));
  // fix the broken map above
  return [
    "## Hozir haqiqatan ulangan (server process.env)\n",
    ...s.connected.map((c) => `✅ **${c.name}** — ${c.detail}`),
    "\n## Ulanmagan",
    ...s.disconnected.map(
      (c) =>
        `❌ **${c.name}** — ${c.detail}` +
        (c.env_hint?.length ? ` → Railway Variables: \`${c.env_hint.join("` / `")}\`` : "")
    ),
    "\n## Mavjud tool lar (o'ylab chiqarilmagan)",
    ...s.tools.map((t) => `- \`${t.name}\` — ${t.description}`),
    "\n_Manba: /api/brain/status_",
  ].join("\n");
}

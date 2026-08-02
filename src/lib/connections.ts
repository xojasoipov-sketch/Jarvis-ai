/**
 * Runtime connection map — truth for AI Brain system prompt.
 */
import { getProviders } from "@/lib/providers";
import { dbConfigured } from "@/lib/supabase";
import { BUILTIN_TOOLS } from "@/lib/tools";
import { listMcpTools, listMcpServers, getAllTools } from "@/lib/mcp-tools";
import { vaultConfigured } from "@/lib/githubVault";
import { repoConfigured } from "@/lib/githubRepo";

export type ConnectionItem = {
  id: string;
  name: string;
  ok: boolean;
  detail: string;
  category: string;
  env_vars?: string[];
};

function hasEnv(...names: string[]) {
  return names.some((n) => Boolean(process.env[n]?.trim()));
}

export function getConnectionsSnapshot(): ConnectionItem[] {
  const items: ConnectionItem[] = [];

  // ── LLM ───────────────────────────────────────────────────
  for (const p of getProviders()) {
    if (p.name === "pollinations") {
      items.push({
        id: "pollinations",
        name: "Pollinations (LLM)",
        ok: true,
        detail: "Bepul text, key shart emas",
        category: "llm",
      });
      continue;
    }
    if (!p.key || p.key === "dummy") continue;
    items.push({
      id: p.name,
      name: p.local ? `Local LLM (${p.model})` : `LLM: ${p.name}`,
      ok: true,
      detail: `${p.model}${p.supportsTools ? " | tool-calling YES" : " | no native tools"}`,
      category: "llm",
    });
  }

  // ── Data ──────────────────────────────────────────────────
  items.push({
    id: "supabase",
    name: "Supabase (DB)",
    ok: dbConfigured,
    detail: dbConfigured
      ? "URL+key bor → tasks, knowledge, projects, CRM"
      : "SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY yo'q yoki noto'g'ri",
    category: "data",
    env_vars: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  });

  // ── Messaging ─────────────────────────────────────────────
  items.push({
    id: "telegram",
    name: "Telegram Bot",
    ok: hasEnv("TELEGRAM_BOT_TOKEN"),
    detail: hasEnv("TELEGRAM_BOT_TOKEN")
      ? `Token bor${hasEnv("TELEGRAM_ALLOWED_USERS") ? " + ALLOWED_USERS" : ""}`
      : "TELEGRAM_BOT_TOKEN yo'q",
    category: "messaging",
    env_vars: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USERS"],
  });

  // ── GitHub / Obsidian ─────────────────────────────────────
  items.push({
    id: "github",
    name: "GitHub (code + PR)",
    ok: repoConfigured || hasEnv("GITHUB_TOKEN", "GITHUB_PERSONAL_ACCESS_TOKEN", "GH_TOKEN"),
    detail: hasEnv("GITHUB_TOKEN", "GITHUB_PERSONAL_ACCESS_TOKEN", "GH_TOKEN")
      ? "Token bor → propose_code_change, merge_pull_request"
      : "GITHUB_TOKEN / GITHUB_PERSONAL_ACCESS_TOKEN yo'q",
    category: "code",
    env_vars: ["GITHUB_TOKEN", "GITHUB_PERSONAL_ACCESS_TOKEN"],
  });

  items.push({
    id: "obsidian_vault",
    name: "Obsidian Vault (GitHub)",
    ok: vaultConfigured,
    detail: vaultConfigured
      ? `Repo vault yo'li sozlangan → vault_read/write/search/list, create_file, read_file`
      : "GitHub token kerak (GITHUB_TOKEN) — vault GitHub orqali",
    category: "knowledge",
    env_vars: ["GITHUB_TOKEN", "GITHUB_VAULT_REPO", "GITHUB_VAULT_PATH"],
  });

  // ── Hermes ────────────────────────────────────────────────
  items.push({
    id: "hermes",
    name: "Hermes (agent orchestrator)",
    ok: true,
    detail: "Built-in /api/hermes — multi-agent routing (har doim mavjud)",
    category: "agents",
  });

  // ── Voice ─────────────────────────────────────────────────
  items.push({
    id: "elevenlabs",
    name: "ElevenLabs",
    ok: hasEnv("ELEVENLABS_API_KEY"),
    detail: hasEnv("ELEVENLABS_API_KEY") ? "TTS/STT" : "ELEVENLABS_API_KEY yo'q",
    category: "voice",
  });
  items.push({
    id: "gemini",
    name: "Gemini API",
    ok: hasEnv("GEMINI_API_KEY"),
    detail: hasEnv("GEMINI_API_KEY") ? "Audio/STT/multimodal" : "GEMINI_API_KEY yo'q",
    category: "voice",
  });
  items.push({
    id: "groq",
    name: "Groq (tools+STT)",
    ok: hasEnv("GROQ_API_KEY"),
    detail: hasEnv("GROQ_API_KEY")
      ? "Tool-calling + Whisper"
      : "GROQ_API_KEY yo'q — tool loop zaiflashadi",
    category: "llm",
  });

  // ── MCP ───────────────────────────────────────────────────
  const mcp = listMcpTools();
  const servers = listMcpServers();
  items.push({
    id: "mcp_tools",
    name: "MCP HTTP tools",
    ok: mcp.length > 0,
    detail: mcp.length ? mcp.map((t) => t.name).join(", ") : "MCP_TOOLS_JSON bo'sh",
    category: "mcp",
  });
  items.push({
    id: "mcp_servers",
    name: "MCP Servers",
    ok: servers.length > 0,
    detail: servers.length ? servers.map((s) => s.name).join(", ") : "MCP_SERVERS_JSON bo'sh",
    category: "mcp",
  });

  // ── Internet always ───────────────────────────────────────
  items.push({
    id: "internet",
    name: "Internet (web_search / web_fetch / extract_*)",
    ok: true,
    detail: "DuckDuckGo + Wikipedia + fetch — har doim (server-side)",
    category: "internet",
  });

  return items;
}

export function buildBrainContext(): string {
  const snap = getConnectionsSnapshot();
  const ok = snap.filter((c) => c.ok);
  const missing = snap.filter((c) => !c.ok);
  const allToolNames = getAllTools().map((t) => t.name);

  const lines: string[] = [
    "# TIZIM HOLATI (FAKT — o'zing o'ylab chiqarma)",
    "",
    "## ✅ ULANGBAN",
  ];
  for (const c of ok) {
    lines.push(`- ${c.name}: ${c.detail}`);
  }
  lines.push("", "## ❌ ULANMAGAN");
  for (const c of missing) {
    lines.push(`- ${c.name}: ${c.detail}`);
  }
  lines.push("", "## BARCHA TOOL LAR (faqat shular mavjud — boshqa nom o'ylab topma)");
  lines.push(allToolNames.join(", "));
  lines.push("");
  lines.push("Muhim mapping:");
  lines.push("- create_file / read_file → Obsidian vault (GitHub)");
  lines.push("- knowledge_* / create_task / get_business_overview → Supabase");
  lines.push("- propose_code_change → GitHub");
  lines.push("- web_search / web_fetch / extract_* → Internet");
  lines.push("- mcp_list_servers / mcp_call → MCP");
  lines.push("- list_connections → shu inventory JSON");
  lines.push("");
  lines.push("Foydalanuvchi 'nima ulangan?' desa — list_connections chaqir yoki yuqoridagi ro'yxatni ayt.");

  return lines.join("\n");
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
      env_vars: c.env_vars,
    })),
    tools: getAllTools().map((t) => t.name),
    mcp_tools: listMcpTools().map((t) => t.name),
    mcp_servers: listMcpServers(),
    note: "Bu server process.env dan o'qilgan haqiqiy holat",
  };
}

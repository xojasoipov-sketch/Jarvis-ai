/**
 * Runtime connection map for AI Brain.
 * System prompt and tools must reflect what is ACTUALLY configured.
 */
import { getProviders } from "@/lib/providers";
import { dbConfigured } from "@/lib/supabase";
import { BUILTIN_TOOLS } from "@/lib/tools";
import { listMcpTools } from "@/lib/mcp-tools";

export type ConnectionItem = {
  id: string;
  name: string;
  ok: boolean;
  detail: string;
  category: "llm" | "data" | "messaging" | "code" | "voice" | "tools" | "other";
};

export function getConnectionsSnapshot(): ConnectionItem[] {
  const items: ConnectionItem[] = [];

  // LLM providers
  const providers = getProviders().filter((p) => p.key && p.key !== "dummy");
  const pollinations = getProviders().find((p) => p.name === "pollinations");
  if (pollinations) {
    items.push({
      id: "pollinations",
      name: "Pollinations",
      ok: true,
      detail: "Bepul text API (key shart emas)",
      category: "llm",
    });
  }
  for (const p of providers) {
    if (p.name === "pollinations") continue;
    items.push({
      id: p.name,
      name: p.local ? `Local LLM (${p.model})` : p.name,
      ok: true,
      detail: `${p.model}${p.supportsTools ? " · tools" : ""}${p.local ? " · Ollama/local" : ""}`,
      category: "llm",
    });
  }

  // Data
  items.push({
    id: "supabase",
    name: "Supabase",
    ok: dbConfigured,
    detail: dbConfigured
      ? "Tasks, knowledge, conversations, CRM data"
      : "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY kerak",
    category: "data",
  });

  // Messaging
  const tg = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  items.push({
    id: "telegram",
    name: "Telegram Bot",
    ok: tg,
    detail: tg ? "Bot token sozlangan" : "TELEGRAM_BOT_TOKEN yo'q",
    category: "messaging",
  });

  // GitHub / vault
  const gh = Boolean(
    process.env.GITHUB_TOKEN ||
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN ||
      process.env.GH_TOKEN
  );
  items.push({
    id: "github",
    name: "GitHub",
    ok: gh,
    detail: gh
      ? "PR / vault / self-improve"
      : "GITHUB_TOKEN yoki GITHUB_PERSONAL_ACCESS_TOKEN kerak",
    category: "code",
  });

  // Voice
  items.push({
    id: "elevenlabs",
    name: "ElevenLabs",
    ok: Boolean(process.env.ELEVENLABS_API_KEY),
    detail: process.env.ELEVENLABS_API_KEY ? "TTS/STT" : "ELEVENLABS_API_KEY yo'q",
    category: "voice",
  });
  items.push({
    id: "gemini",
    name: "Gemini",
    ok: Boolean(process.env.GEMINI_API_KEY),
    detail: process.env.GEMINI_API_KEY ? "STT / multimodal" : "GEMINI_API_KEY yo'q",
    category: "voice",
  });

  // Built-in tools always available
  items.push({
    id: "builtin_tools",
    name: "Built-in tools",
    ok: true,
    detail: BUILTIN_TOOLS.map((t) => t.name).join(", "),
    category: "tools",
  });

  const mcp = listMcpTools();
  items.push({
    id: "mcp",
    name: "MCP HTTP tools",
    ok: mcp.length > 0,
    detail: mcp.length ? mcp.map((t) => t.name).join(", ") : "MCP_TOOLS_JSON bo'sh",
    category: "tools",
  });

  return items;
}

/** Compact text for system prompt — only truth */
export function buildBrainContext(): string {
  const snap = getConnectionsSnapshot();
  const ok = snap.filter((c) => c.ok);
  const missing = snap.filter((c) => !c.ok);

  const lines: string[] = [
    "## HOZIR ULANGBAN (faqat shulardan foydalan)",
  ];

  for (const c of ok) {
    lines.push(`- ✅ ${c.name}: ${c.detail}`);
  }

  if (missing.length) {
    lines.push("\n## ULANMAGAN (mavjud deb o'ylama, so'rama ham ishlatma)");
    for (const c of missing) {
      lines.push(`- ❌ ${c.name}: ${c.detail}`);
    }
  }

  const toolNames = BUILTIN_TOOLS.map((t) => t.name);
  const mcp = listMcpTools().map((t) => t.name);
  lines.push("\n## CHAQIRISH MUMKIN BO'LGAN TOOL LAR");
  lines.push(toolNames.join(", ") + (mcp.length ? ", " + mcp.join(", ") : ""));
  lines.push(
    "\nQoida: faqat yuqoridagi ✅ ulanishlar va tool lar ishlaydi. Ulanmagan xizmatni 'bor' deb aytma. Kerak bo'lsa list_connections tool chaqir."
  );

  return lines.join("\n");
}

export function connectionsSummaryJson() {
  const snap = getConnectionsSnapshot();
  return {
    connected: snap.filter((c) => c.ok).map((c) => ({ id: c.id, name: c.name, detail: c.detail })),
    disconnected: snap.filter((c) => !c.ok).map((c) => ({ id: c.id, name: c.name, detail: c.detail })),
    tools: BUILTIN_TOOLS.map((t) => t.name),
    mcp_tools: listMcpTools().map((t) => t.name),
  };
}

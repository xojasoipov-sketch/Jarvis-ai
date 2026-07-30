import { NextRequest, NextResponse } from "next/server";
import { vaultConfigured, listVault, readVaultFile, writeVaultFile, searchVault } from "@/lib/githubVault";

const HERMES_URL = process.env.HERMES_URL || "";
const HERMES_KEY = process.env.HERMES_KEY || "";

function hermesHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HERMES_KEY) headers["Authorization"] = `Bearer ${HERMES_KEY}`;
  return headers;
}

// Built-in tools — run directly on the Railway server, no external gateway needed.
type ToolDef = { name: string; description: string; run: (args: Record<string, unknown>) => Promise<unknown> };

const BUILTIN_TOOLS: ToolDef[] = [
  {
    name: "calculator",
    description: "Matematik ifodani hisoblaydi. args: { expression: string }",
    run: async (args) => {
      const expr = String(args.expression || "");
      if (!/^[0-9+\-*/().\s%]+$/.test(expr)) throw new Error("Faqat sonlar va +-*/()% belgilariga ruxsat");
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();
      return { expression: expr, result };
    },
  },
  {
    name: "datetime",
    description: "Joriy sana va vaqtni qaytaradi",
    run: async () => ({ iso: new Date().toISOString(), readable: new Date().toString() }),
  },
  {
    name: "web_fetch",
    description: "URL'dan matn (HTML) tarkibini oladi. args: { url: string }",
    run: async (args) => {
      const url = String(args.url || "");
      if (!/^https?:\/\//.test(url)) throw new Error("To'g'ri URL kiriting");
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const text = await res.text();
      return { url, status: res.status, content: text.slice(0, 5000) };
    },
  },
  {
    name: "vault_read",
    description: "Obsidian vault'dan faylni o'qiydi. args: { path: string }",
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      const content = await readVaultFile(String(args.path || ""));
      return { path: args.path, content };
    },
  },
  {
    name: "vault_write",
    description: "Obsidian vault'ga fayl yozadi. args: { path: string, content: string }",
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      await writeVaultFile(String(args.path || ""), String(args.content || ""));
      return { ok: true, path: args.path };
    },
  },
  {
    name: "vault_search",
    description: "Obsidian vault ichida qidiradi. args: { query: string }",
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      return { results: await searchVault(String(args.query || "")) };
    },
  },
  {
    name: "vault_list",
    description: "Obsidian vault fayllarini ro'yxatlaydi. args: { path?: string }",
    run: async (args) => {
      if (!vaultConfigured) throw new Error("Vault sozlanmagan (GITHUB_TOKEN kerak)");
      return { files: await listVault(String(args.path || "")) };
    },
  },
];

// GET /api/mcp — list available tools (built-in + external Hermes if configured)
export async function GET() {
  const tools = BUILTIN_TOOLS.map((t) => ({ name: t.name, description: t.description, source: "builtin" }));

  if (HERMES_URL) {
    try {
      const res = await fetch(`${HERMES_URL}/tools`, { headers: hermesHeaders(), signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const external = (data.tools || data || []).map((t: { name: string; description?: string }) => ({
          name: t.name,
          description: t.description || "",
          source: "hermes",
        }));
        tools.push(...external);
      }
    } catch {
      // external gateway unreachable — built-in tools still work
    }
  }

  return NextResponse.json({ tools, configured: true });
}

// POST /api/mcp — run a tool  { tool, args }
export async function POST(req: NextRequest) {
  const { tool, args } = await req.json();
  const builtin = BUILTIN_TOOLS.find((t) => t.name === tool);

  if (builtin) {
    try {
      const result = await builtin.run(args || {});
      return NextResponse.json({ ok: true, tool, result });
    } catch (err) {
      return NextResponse.json({ ok: false, tool, error: (err as Error).message }, { status: 400 });
    }
  }

  if (HERMES_URL) {
    try {
      const res = await fetch(`${HERMES_URL}/tools/${tool}/call`, {
        method: "POST",
        headers: hermesHeaders(),
        body: JSON.stringify(args || {}),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return NextResponse.json({ error: res.statusText }, { status: res.status });
      return NextResponse.json(await res.json());
    } catch {
      return NextResponse.json({ error: "Hermes ulanmadi" }, { status: 503 });
    }
  }

  return NextResponse.json({ error: `Noma'lum vosita: ${tool}` }, { status: 404 });
}

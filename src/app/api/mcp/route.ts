import { NextRequest, NextResponse } from "next/server";
import { BUILTIN_TOOLS, runTool } from "@/lib/tools";

const HERMES_URL = process.env.HERMES_URL || "";
const HERMES_KEY = process.env.HERMES_KEY || "";

function hermesHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HERMES_KEY) headers["Authorization"] = `Bearer ${HERMES_KEY}`;
  return headers;
}

function parseJsonEnv(name: string): unknown[] {
  const raw = process.env[name];
  if (!raw?.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const tools = BUILTIN_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    source: "builtin" as const,
  }));

  if (HERMES_URL) {
    try {
      const res = await fetch(`${HERMES_URL}/tools`, {
        headers: hermesHeaders(),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        const external = (data.tools || data || []).map((t: { name: string; description?: string }) => ({
          name: t.name,
          description: t.description || "",
          source: "hermes" as const,
        }));
        tools.push(...external);
      }
    } catch {}
  }

  const mcpTools = parseJsonEnv("MCP_TOOLS_JSON");
  for (const t of mcpTools as { name?: string; description?: string }[]) {
    if (t?.name) {
      tools.push({
        name: t.name,
        description: t.description || "MCP_TOOLS_JSON",
        source: "mcp_json" as const,
      });
    }
  }

  const mcpServers = parseJsonEnv("MCP_SERVERS_JSON");

  return NextResponse.json({
    configured: true,
    tools,
    tool_count: tools.length,
    mcp: {
      hermes_url: Boolean(HERMES_URL),
      mcp_tools_json_count: mcpTools.length,
      mcp_servers_json_count: mcpServers.length,
      servers: (mcpServers as { name?: string; url?: string }[]).map((s) => ({
        name: s.name || "server",
        url: s.url ? String(s.url).slice(0, 60) : null,
      })),
    },
    telegram_tool: tools.some((t) => t.name === "telegram_send"),
    note: "Telegram = telegram_send / telegram_get_me. MCP = builtin + HERMES_URL + MCP_*_JSON",
  });
}

export async function POST(req: NextRequest) {
  const { tool, args } = await req.json();

  if (BUILTIN_TOOLS.some((t) => t.name === tool)) {
    try {
      const result = await runTool(tool, args || {});
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

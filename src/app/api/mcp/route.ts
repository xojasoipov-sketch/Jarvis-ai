import { NextRequest, NextResponse } from "next/server";
import { BUILTIN_TOOLS, runTool } from "@/lib/tools";

const HERMES_URL = process.env.HERMES_URL || "";
const HERMES_KEY = process.env.HERMES_KEY || "";

function hermesHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HERMES_KEY) headers["Authorization"] = `Bearer ${HERMES_KEY}`;
  return headers;
}

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

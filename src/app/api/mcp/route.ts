import { NextRequest, NextResponse } from "next/server";
import { getAllTools, listMcpTools, runAnyTool, toolsAsOpenAIFunctionsAll } from "@/lib/mcp-tools";

// GET — mavjud MCP + built-in tool ro'yxati
export async function GET() {
  const mcp = listMcpTools();
  const all = getAllTools().map((t) => ({ name: t.name, description: t.description }));
  return NextResponse.json({
    ok: true,
    description:
      "MCP-uslubidagi tool reyestri. Tashqi tool'lar uchun Vercel env: MCP_TOOLS_JSON='[{\"name\":\"x\",\"description\":\"...\",\"url\":\"https://...\"}]'",
    mcp_tools: mcp,
    all_tools: all,
    openai_functions_count: toolsAsOpenAIFunctionsAll().length,
  });
}

// POST { name, args } — istalgan tool (built-in yoki mcp_*) ishga tushirish
export async function POST(req: NextRequest) {
  const { name, args } = await req.json();
  if (!name) return NextResponse.json({ error: "name kerak" }, { status: 400 });
  try {
    const result = await runAnyTool(String(name), (args || {}) as Record<string, unknown>);
    return NextResponse.json({ ok: true, name, result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

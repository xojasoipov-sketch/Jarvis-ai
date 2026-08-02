import { NextRequest, NextResponse } from "next/server";
import {
  getAllTools,
  listMcpTools,
  listMcpServers,
  listServerTools,
  loadMcpServersFromEnv,
  runAnyTool,
  toolsAsOpenAIFunctionsAll,
} from "@/lib/mcp-tools";

export async function GET() {
  const mcp = listMcpTools();
  const servers = listMcpServers();
  const serverDetails = [];
  for (const s of loadMcpServersFromEnv()) {
    const tools = await listServerTools(s);
    serverDetails.push({ name: s.name, url: s.url, tools });
  }
  const all = getAllTools().map((t) => ({ name: t.name, description: t.description }));
  return NextResponse.json({
    ok: true,
    mcp_http_tools: mcp,
    mcp_servers: serverDetails,
    all_tools: all,
    openai_functions_count: toolsAsOpenAIFunctionsAll().length,
    env_help: {
      MCP_TOOLS_JSON: '[{"name":"weather","description":"...","url":"https://..."}]',
      MCP_SERVERS_JSON:
        '[{"name":"my-mcp","url":"https://your-mcp-host","headers":{"Authorization":"Bearer ..."}}]',
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, args } = body;
  if (!name) return NextResponse.json({ error: "name kerak" }, { status: 400 });
  try {
    const result = await runAnyTool(String(name), (args || {}) as Record<string, unknown>);
    return NextResponse.json({ ok: true, name, result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

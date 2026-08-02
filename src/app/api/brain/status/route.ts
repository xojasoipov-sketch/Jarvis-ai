import { NextResponse } from "next/server";
import { connectionsSummaryJson, getConnectionsSnapshot } from "@/lib/connections";
import { toolsAsOpenAIFunctionsAll } from "@/lib/mcp-tools";

export async function GET() {
  const snap = getConnectionsSnapshot();
  const tools = toolsAsOpenAIFunctionsAll().map((t) => t.function.name);
  return NextResponse.json({
    ok: true,
    summary: connectionsSummaryJson(),
    connections: snap,
    tool_count: tools.length,
    tools,
    note: "Chat har so'rovda buildBrainContext() ni system promptga qo'shadi.",
  });
}

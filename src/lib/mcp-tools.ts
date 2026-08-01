// MCP-uslubidagi kengaytirilgan tool reyestri — OpenJarvis MCP g'oyasidan moslashtirilgan.
// Tashqi HTTP tool'larni env orqali ulash mumkin; mavjud BUILTIN_TOOLS bilan birga ishlaydi.
import { BUILTIN_TOOLS, type ToolDef, runTool as runBuiltin } from "./tools";

export type McpHttpTool = {
  name: string;
  description: string;
  url: string; // POST endpoint — body: { args: object }
  headers?: Record<string, string>;
};

/** Env: MCP_TOOLS_JSON='[{"name":"weather","description":"...","url":"https://..."}]' */
function loadHttpToolsFromEnv(): McpHttpTool[] {
  const raw = process.env.MCP_TOOLS_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as McpHttpTool[];
    return Array.isArray(parsed)
      ? parsed.filter((t) => t?.name && t?.url)
      : [];
  } catch {
    return [];
  }
}

function httpToolToDef(t: McpHttpTool): ToolDef {
  return {
    name: `mcp_${t.name}`,
    description: `[MCP] ${t.description}`,
    parameters: {
      type: "object",
      properties: {
        args: { type: "object", description: "Tool argumentlari (JSON object)" },
      },
    },
    run: async (args) => {
      const res = await fetch(t.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(t.headers || {}),
        },
        body: JSON.stringify({ args: args.args ?? args }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`MCP tool ${t.name} xato: ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return res.json();
      return { text: (await res.text()).slice(0, 5000) };
    },
  };
}

/** Barcha tool'lar: built-in + MCP HTTP */
export function getAllTools(): ToolDef[] {
  const mcp = loadHttpToolsFromEnv().map(httpToolToDef);
  return [...BUILTIN_TOOLS, ...mcp];
}

export function toolsAsOpenAIFunctionsAll() {
  return getAllTools().map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export async function runAnyTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const all = getAllTools();
  const tool = all.find((t) => t.name === name);
  if (tool) return tool.run(args);
  // Fallback: faqat built-in
  return runBuiltin(name, args);
}

export function listMcpTools() {
  return loadHttpToolsFromEnv().map((t) => ({
    name: `mcp_${t.name}`,
    description: t.description,
    url: t.url,
  }));
}

/**
 * MCP-style tools + HTTP MCP servers.
 */
import { BUILTIN_TOOLS, type ToolDef, runTool as runBuiltin } from "./tools";

export type McpHttpTool = {
  name: string;
  description: string;
  url: string;
  headers?: Record<string, string>;
};

export type McpServer = {
  name: string;
  url: string;
  headers?: Record<string, string>;
};

function parseJsonEnv<T>(raw: string | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadHttpToolsFromEnv(): McpHttpTool[] {
  return parseJsonEnv<McpHttpTool>(process.env.MCP_TOOLS_JSON).filter((t) => t?.name && t?.url);
}

export function loadMcpServersFromEnv(): McpServer[] {
  return parseJsonEnv<McpServer>(process.env.MCP_SERVERS_JSON).filter((s) => s?.name && s?.url);
}

function httpToolToDef(t: McpHttpTool): ToolDef {
  return {
    name: `mcp_${t.name}`,
    description: `[MCP tool] ${t.description}`,
    parameters: {
      type: "object",
      properties: {
        args: { type: "object", description: "Argumentlar" },
      },
    },
    run: async (args) => {
      const res = await fetch(t.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(t.headers || {}) },
        body: JSON.stringify({ args: args.args ?? args }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`MCP tool ${t.name}: HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("json")) return res.json();
      return { text: (await res.text()).slice(0, 5000) };
    },
  };
}

export async function listServerTools(server: McpServer): Promise<{ name: string; description: string }[]> {
  const base = server.url.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", ...(server.headers || {}) };
  try {
    const r = await fetch(`${base}/tools`, { headers, signal: AbortSignal.timeout(10000) });
    if (r.ok) {
      const data = await r.json();
      const arr = data.tools || data || [];
      if (Array.isArray(arr)) {
        return arr.map((t: { name?: string; description?: string }) => ({
          name: t.name || "unknown",
          description: t.description || "",
        }));
      }
    }
  } catch {}
  try {
    const r = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      signal: AbortSignal.timeout(10000),
    });
    if (r.ok) {
      const data = await r.json();
      const arr = data.result?.tools || data.tools || [];
      if (Array.isArray(arr)) {
        return arr.map((t: { name?: string; description?: string }) => ({
          name: t.name || "unknown",
          description: t.description || "",
        }));
      }
    }
  } catch {}
  return [];
}

export async function callServerTool(
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const base = server.url.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", ...(server.headers || {}) };
  try {
    const r = await fetch(`${base}/call`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: toolName, arguments: args, args }),
      signal: AbortSignal.timeout(30000),
    });
    if (r.ok) {
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("json")) return r.json();
      return { text: (await r.text()).slice(0, 8000) };
    }
  } catch {}
  const r = await fetch(base, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`MCP server ${server.name}: HTTP ${r.status}`);
  const data = await r.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result ?? data;
}

function serverToolDefs(): ToolDef[] {
  const servers = loadMcpServersFromEnv();
  if (!servers.length) return [];
  return [
    {
      name: "mcp_list_servers",
      description: "Ulangan MCP serverlar va ularning tool larini ko'rsatadi",
      parameters: { type: "object", properties: {} },
      run: async () => {
        const out = [];
        for (const s of servers) {
          const tools = await listServerTools(s);
          out.push({ server: s.name, url: s.url, tools });
        }
        return { servers: out };
      },
    },
    {
      name: "mcp_call",
      description: "MCP server tool chaqirish",
      parameters: {
        type: "object",
        properties: {
          server: { type: "string" },
          tool: { type: "string" },
          args: { type: "object" },
        },
        required: ["server", "tool"],
      },
      run: async (args) => {
        const serverName = String(args.server || "");
        const toolName = String(args.tool || "");
        const server = servers.find((s) => s.name === serverName);
        if (!server) throw new Error(`MCP server topilmadi: ${serverName}`);
        return callServerTool(server, toolName, (args.args as Record<string, unknown>) || {});
      },
    },
  ];
}

export function getAllTools(): ToolDef[] {
  const mcp = loadHttpToolsFromEnv().map(httpToolToDef);
  const serverTools = serverToolDefs();
  return [...BUILTIN_TOOLS, ...mcp, ...serverTools];
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
  return runBuiltin(name, args);
}

export function listMcpTools() {
  return loadHttpToolsFromEnv().map((t) => ({
    name: `mcp_${t.name}`,
    description: t.description,
    url: t.url,
  }));
}

export function listMcpServers() {
  return loadMcpServersFromEnv().map((s) => ({ name: s.name, url: s.url }));
}

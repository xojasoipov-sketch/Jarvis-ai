"use client";
import { useState, useEffect } from "react";
import { ScrollText, RefreshCw, Filter } from "lucide-react";

type Level = "info" | "warn" | "error" | "debug";
type Log = { id: number; ts: string; level: Level; service: string; message: string };

const LEVEL_COLORS: Record<Level, string> = {
  info: "text-blue-600 bg-blue-50",
  warn: "text-yellow-600 bg-yellow-50",
  error: "text-red-600 bg-red-50",
  debug: "text-gray-500 bg-gray-100",
};

const RAW: [Level, string, string][] = [
  ["info", "chat-api", "POST /api/chat — 200 OK (1.2s) — openrouter/gemini-2.0-flash"],
  ["info", "telegram", "Webhook received: /start from @sadi_prime"],
  ["info", "chat-api", "POST /api/agent — 200 OK (0.9s) — CEO Agent"],
  ["warn", "obsidian", "Obsidian ulanmadi: OBSIDIAN_URL o'rnatilmagan"],
  ["info", "chat-api", "POST /api/chat — 200 OK (1.4s) — groq/llama-3.3-70b"],
  ["warn", "mcp", "Hermes MCP topilmadi: localhost:3001"],
  ["info", "deploy", "Railway deployment successful — commit df3e2c0"],
  ["info", "chat-api", "POST /api/chat — 200 OK (0.8s) — mistral-large"],
  ["error", "telegram", "Webhook delivery failed: connection timeout"],
  ["info", "agent", "Research Agent task completed in 2.1s"],
  ["debug", "cache", "Cache hit: /api/search?q=pari+ai"],
  ["info", "chat-api", "POST /api/chat — 200 OK (1.1s) — openrouter/gemini-2.0-flash"],
];

function buildLogs(): Log[] {
  return RAW.map((e, i) => ({
    id: i + 1,
    ts: new Date(Date.now() - (RAW.length - i) * 90000).toISOString(),
    level: e[0], service: e[1], message: e[2],
  })).reverse();
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState<"all" | Level>("all");
  const [loading, setLoading] = useState(false);

  function refresh() {
    setLoading(true);
    setTimeout(() => { setLogs(buildLogs()); setLoading(false); }, 400);
  }

  useEffect(() => { setLogs(buildLogs()); }, []);

  const shown = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  return (
    <div className="fade-in max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tizim jurnali va so'rovlar tarixi</p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 text-sm rounded-xl transition-all">
          <RefreshCw size={14} strokeWidth={1.75} className={loading ? "animate-spin" : ""} />
          Yangilash
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} strokeWidth={1.75} className="text-gray-400" />
        {(["all", "info", "warn", "error", "debug"] as const).map((l) => (
          <button key={l} onClick={() => setFilter(l)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
              filter === l ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
            }`}>
            {l.toUpperCase()}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{shown.length} ta yozuv</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {shown.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-3 font-mono text-xs hover:bg-gray-50 transition-colors">
              <span className="text-gray-400 flex-shrink-0 w-20">{new Date(log.ts).toLocaleTimeString()}</span>
              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold w-12 text-center ${LEVEL_COLORS[log.level]}`}>
                {log.level.toUpperCase()}
              </span>
              <span className="text-indigo-500 flex-shrink-0 w-20 truncate">{log.service}</span>
              <span className="text-gray-700 flex-1 break-all">{log.message}</span>
            </div>
          ))}
          {shown.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <ScrollText size={32} strokeWidth={1.25} className="mx-auto mb-3" />
              <p className="text-sm">Log yozuvlari yo'q</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

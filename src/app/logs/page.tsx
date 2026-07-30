"use client";
import { useState, useEffect, useCallback } from "react";
import { ScrollText, RefreshCw, Filter } from "lucide-react";

type Level = "info" | "warn" | "error" | "debug";
type Log = { id: number; ts: number; level: Level; service: string; message: string };

const LEVEL_COLORS: Record<Level, string> = {
  info: "text-blue-600 bg-blue-50",
  warn: "text-yellow-600 bg-yellow-50",
  error: "text-red-600 bg-red-50",
  debug: "text-gray-500 bg-gray-100",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState<"all" | Level>("all");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/logs");
      const d = await r.json();
      setLogs(d.logs || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const shown = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  return (
    <div className="fade-in max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Haqiqiy so'rovlar jurnali (server qayta ishga tushsa tozalanadi)</p>
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
          {shown.map((entry) => (
            <div key={entry.id} className="px-5 py-3 flex items-start gap-3 font-mono text-xs hover:bg-gray-50 transition-colors">
              <span className="text-gray-400 flex-shrink-0 w-20">{new Date(entry.ts).toLocaleTimeString()}</span>
              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold w-12 text-center ${LEVEL_COLORS[entry.level]}`}>
                {entry.level.toUpperCase()}
              </span>
              <span className="text-indigo-500 flex-shrink-0 w-20 truncate">{entry.service}</span>
              <span className="text-gray-700 flex-1 break-all">{entry.message}</span>
            </div>
          ))}
          {!loading && shown.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <ScrollText size={32} strokeWidth={1.25} className="mx-auto mb-3" />
              <p className="text-sm">Hali log yozuvlari yo&apos;q — ilovadan foydalanganingizda bu yerda paydo bo&apos;ladi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

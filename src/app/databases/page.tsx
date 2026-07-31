"use client";
import { useState, useEffect } from "react";
import { Database, RefreshCw, Play, CheckCircle2, XCircle, Copy, Check } from "lucide-react";

const SETUP_SQL = `create or replace function pari_run_readonly_query(query_text text)
returns setof json language plpgsql security definer as $$
begin
  if query_text !~* '^\\s*select' then
    raise exception 'Faqat SELECT so''rovlariga ruxsat berilgan';
  end if;
  return query execute format('select row_to_json(t) from (%s) t', query_text);
end;
$$;`;

export default function DatabasesPage() {
  const [query, setQuery] = useState("select now();");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/tasks").then((r) => r.json()).then((d) => setConnected(Boolean(d.configured))).catch(() => setConnected(false));
  }, []);

  async function runQuery() {
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/databases/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Xato");
      else setResult(JSON.stringify(data, null, 2));
    } catch { setError("So'rovda tarmoq xatosi"); }
    setLoading(false);
  }

  function copySetup() {
    navigator.clipboard.writeText(SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fade-in max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Databases</h1>
        <p className="text-sm text-gray-500 mt-0.5">Supabase Postgres — bitta haqiqiy ma&apos;lumotlar bazasi ulanishi</p>
      </div>

      <div className="bg-white rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Database size={18} strokeWidth={1.75} className="text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Supabase (PostgreSQL)</p>
            <p className="text-xs text-gray-500 truncate">pari_tasks, pari_projects, pari_agent_runs, pari_events jadvallari</p>
          </div>
          {connected === null ? (
            <RefreshCw size={16} strokeWidth={1.75} className="text-gray-300 animate-spin flex-shrink-0" />
          ) : connected ? (
            <CheckCircle2 size={16} strokeWidth={1.75} className="text-green-500 flex-shrink-0" />
          ) : (
            <XCircle size={16} strokeWidth={1.75} className="text-red-400 flex-shrink-0" />
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 space-y-2">
        <p className="font-semibold">Bir martalik sozlash kerak — Supabase SQL Editor&apos;da bajaring:</p>
        <div className="relative">
          <pre className="bg-white rounded-lg p-3 overflow-x-auto font-mono text-gray-700">{SETUP_SQL}</pre>
          <button onClick={copySetup} className="absolute top-2 right-2 p-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-indigo-600">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
        <p>Bu funksiya faqat <strong>SELECT</strong> so&apos;rovlariga ruxsat beradi — ma&apos;lumotlarni o&apos;zgartirish yoki o&apos;chirish mumkin emas.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">So&apos;rov yuborish (faqat SELECT)</p>
        </div>
        <div className="p-5 space-y-4">
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={4}
            className="w-full p-4 bg-gray-900 text-green-400 rounded-xl text-sm font-mono resize-none focus:outline-none" />
          <button onClick={runQuery} disabled={loading || !connected}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            {loading ? "Bajarilmoqda..." : "Bajarish"}
          </button>
          {!connected && <p className="text-xs text-red-500">Supabase ulanmagan — Connectors sahifasidan sozlang</p>}
          {error && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">{error}</div>}
          {result && (
            <pre className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-mono overflow-x-auto">{result}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

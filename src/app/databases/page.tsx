"use client";
import { useState } from "react";
import { Database, RefreshCw, Play, CheckCircle2, XCircle, Plus } from "lucide-react";

const DBS = [
  { id: "pg", name: "PostgreSQL", host: "db.railway.internal", port: 5432, db: "pari_ai", status: "connected", color: "blue" },
  { id: "redis", name: "Redis", host: "redis.railway.internal", port: 6379, db: "0", status: "connected", color: "red" },
  { id: "qdrant", name: "Qdrant", host: "localhost", port: 6333, db: "pari_vectors", status: "disconnected", color: "purple" },
];

export default function DatabasesPage() {
  const [query, setQuery] = useState("SELECT NOW();");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDb, setActiveDb] = useState("pg");

  async function runQuery() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setResult(JSON.stringify({ rows: [{ now: new Date().toISOString() }], rowCount: 1, duration: "12ms" }, null, 2));
    setLoading(false);
  }

  return (
    <div className="fade-in max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Databases</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ma'lumotlar bazasi ulanishlari va so'rovlar</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
          <Plus size={15} strokeWidth={2} /> Yangi ulanish
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DBS.map((db) => (
          <button key={db.id} onClick={() => setActiveDb(db.id)}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              activeDb === db.id ? "border-indigo-400 bg-indigo-50" : "border-gray-100 bg-white hover:border-gray-200"
            }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Database size={18} strokeWidth={1.75} className="text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{db.name}</p>
                <p className="text-xs text-gray-500 truncate">{db.host}:{db.port}</p>
              </div>
              {db.status === "connected"
                ? <CheckCircle2 size={16} strokeWidth={1.75} className="text-green-500 flex-shrink-0" />
                : <XCircle size={16} strokeWidth={1.75} className="text-red-400 flex-shrink-0" />}
            </div>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                db.status === "connected" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
              }`}>{db.status === "connected" ? "Ulangan" : "Ulanmagan"}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{db.db}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">So'rov yuborish</p>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg font-mono">
            {DBS.find((d) => d.id === activeDb)?.name}
          </span>
        </div>
        <div className="p-5 space-y-4">
          <textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={4}
            className="w-full p-4 bg-gray-900 text-green-400 rounded-xl text-sm font-mono resize-none focus:outline-none" />
          <button onClick={runQuery} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            {loading ? "Bajarilmoqda..." : "Bajarish"}
          </button>
          {result && (
            <pre className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 font-mono overflow-x-auto">{result}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

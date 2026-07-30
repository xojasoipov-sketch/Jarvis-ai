"use client";
import { useState } from "react";
import { Wrench, Send, RefreshCw, Terminal, Cpu } from "lucide-react";

type Tool = { name: string; description: string };

export default function DevToolsPage() {
  const [endpoint, setEndpoint] = useState("/api/chat");
  const [method, setMethod] = useState("POST");
  const [body, setBody] = useState('{\n  "messages": [{"role": "user", "content": "Salom"}]\n}');
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [mcpTools, setMcpTools] = useState<Tool[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpError, setMcpError] = useState("");

  async function sendRequest() {
    setLoading(true);
    setResponse("");
    try {
      const opts: RequestInit = { method, headers: { "Content-Type": "application/json" } };
      if (method !== "GET") opts.body = body;
      const res = await fetch(endpoint, opts);
      const text = await res.text();
      setResponse(`Status: ${res.status}\n\n${text.slice(0, 3000)}`);
    } catch (e) {
      setResponse("Xato: " + String(e));
    }
    setLoading(false);
  }

  async function loadMcpTools() {
    setMcpLoading(true);
    setMcpError("");
    try {
      const res = await fetch("/api/mcp");
      const data = await res.json();
      if (data.error) { setMcpError(data.error); setMcpTools([]); }
      else setMcpTools(data.tools || []);
    } catch {
      setMcpError("Hermes server topilmadi");
    }
    setMcpLoading(false);
  }

  return (
    <div className="fade-in max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dev Tools</h1>
        <p className="text-sm text-gray-500 mt-0.5">API tester, MCP tools, tizim ma'lumotlari</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Terminal size={16} strokeWidth={1.75} className="text-indigo-600" />
            <p className="text-sm font-semibold text-gray-900">API Tester</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex gap-2">
              <select value={method} onChange={(e) => setMethod(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-indigo-600 focus:outline-none w-24">
                {["GET", "POST", "PUT", "DELETE"].map((m) => <option key={m}>{m}</option>)}
              </select>
              <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            {method !== "GET" && (
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                className="w-full p-3 bg-gray-900 text-green-400 rounded-xl text-xs font-mono resize-none focus:outline-none" />
            )}
            <button onClick={sendRequest} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm rounded-xl transition-all">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} strokeWidth={1.75} />}
              Yuborish
            </button>
            {response && (
              <pre className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">{response}</pre>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench size={16} strokeWidth={1.75} className="text-purple-600" />
              <p className="text-sm font-semibold text-gray-900">Hermes MCP Tools</p>
            </div>
            <button onClick={loadMcpTools} disabled={mcpLoading}
              className="text-xs px-3 py-1.5 border border-gray-200 hover:border-indigo-300 text-gray-600 hover:text-indigo-600 rounded-lg transition-all">
              {mcpLoading ? "Yuklanmoqda..." : "Yuklash"}
            </button>
          </div>
          <div className="p-5">
            {mcpError ? (
              <div className="text-center py-6 text-red-400">
                <p className="text-sm">{mcpError}</p>
                <p className="text-xs mt-1 text-gray-400">Settings → HERMES_URL o'rnating</p>
              </div>
            ) : mcpTools.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Wrench size={32} strokeWidth={1.25} className="mx-auto mb-3" />
                <p className="text-sm">Hermes MCP ga ulaning</p>
                <p className="text-xs mt-1">Settings → Hermes URL o'rnating</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mcpTools.map((t) => (
                  <div key={t.name} className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm font-mono font-medium text-indigo-600">{t.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={16} strokeWidth={1.75} className="text-green-600" />
            <p className="text-sm font-semibold text-gray-900">Tizim ma'lumotlari</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Muhit", value: "Railway Production" },
              { label: "Node.js", value: "20.x LTS" },
              { label: "Next.js", value: "16.2.12" },
              { label: "Region", value: "US-West" },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

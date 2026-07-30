"use client";
import { useState } from "react";
import { Plus, Sparkles, StickyNote, Globe, FileText, BookOpen, FolderOpen, Search, RefreshCw } from "lucide-react";

type Doc = { id: number; title: string; type: "note" | "web" | "file"; content: string; tags: string[]; date: string };
type VaultFile = { path: string };
type VaultResult = { filename: string; score: number; context: string };

const TYPE_ICONS = { note: StickyNote, web: Globe, file: FileText };

const INIT_DOCS: Doc[] = [
  { id: 1, title: "Pari AI Arxitektura", type: "note", content: "Ko'p agentli tizim: CEO, Researcher, Coder, Analyst, Writer, Marketing, DevOps, Assistant agentlari parallel ishlaydi. Multi-provider fallback: OpenRouter → Mistral → Groq → Cerebras.", tags: ["AI", "Arxitektura"], date: "2026-07-29" },
  { id: 2, title: "Business Model Canvas", type: "note", content: "Value Proposition: Bitta AI platformasi barcha biznes vazifalarini bajaradi. Mijozlar: Kichik va o'rta bizneslar. Daromad: Subscription + API qo'ng'iroqlari.", tags: ["Biznes", "Model"], date: "2026-07-28" },
  { id: 3, title: "Railway Deploy Qo'llanma", type: "web", content: "Railway.app — Node.js loyihalar uchun eng oson deploy platformasi. NIXPACKS builder ishlatiladi. Env vars dashboard orqali o'rnatiladi.", tags: ["DevOps", "Railway"], date: "2026-07-27" },
];

function LocalNotes() {
  const [docs, setDocs] = useState<Doc[]>(INIT_DOCS);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", content: "", tags: "" });
  const [selected, setSelected] = useState<Doc | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = docs.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.content.toLowerCase().includes(search.toLowerCase()) ||
    d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  function addDoc() {
    if (!newDoc.title.trim()) return;
    setDocs((prev) => [...prev, { id: Date.now(), title: newDoc.title, type: "note", content: newDoc.content, tags: newDoc.tags.split(",").map((t) => t.trim()).filter(Boolean), date: new Date().toISOString().slice(0, 10) }]);
    setNewDoc({ title: "", content: "", tags: "" });
    setShowNew(false);
  }

  async function askAI() {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiAnswer("");
    const context = docs.map((d) => `[${d.title}]: ${d.content}`).join("\n\n");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: `Knowledge base:\n${context}\n\nSavol: ${aiQuery}` }] }) });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let text = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value); setAiAnswer(text); }
    } catch { setAiAnswer("Xato yuz berdi."); }
    setAiLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Sparkles size={15} strokeWidth={1.75} className="text-indigo-600" /> Knowledge base'dan so'rash</p>
        <div className="flex gap-2">
          <input value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askAI()}
            placeholder="Savol bering..."
            className="flex-1 px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <button onClick={askAI} disabled={aiLoading || !aiQuery.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
            {aiLoading ? "..." : "So'rash"}
          </button>
        </div>
        {aiAnswer && <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-100 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnswer}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-3">
          <div className="flex gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..."
              className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            <button onClick={() => setShowNew(true)} className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">
              <Plus size={15} strokeWidth={2} />
            </button>
          </div>
          {showNew && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-2">
              <input value={newDoc.title} onChange={(e) => setNewDoc((p) => ({ ...p, title: e.target.value }))} placeholder="Sarlavha..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              <textarea value={newDoc.content} onChange={(e) => setNewDoc((p) => ({ ...p, content: e.target.value }))} placeholder="Mazmun..." rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none" />
              <input value={newDoc.tags} onChange={(e) => setNewDoc((p) => ({ ...p, tags: e.target.value }))} placeholder="Teglar (vergul bilan)..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">Bekor</button>
                <button onClick={addDoc} className="flex-1 py-2 bg-indigo-600 text-white text-xs rounded-lg">Saqlash</button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {filtered.map((doc) => {
              const Icon = TYPE_ICONS[doc.type];
              return (
                <button key={doc.id} onClick={() => setSelected(doc)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === doc.id ? "border-indigo-300 bg-indigo-50" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={13} strokeWidth={1.75} className="text-gray-500" />
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{doc.content}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {doc.tags.map((t) => <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="col-span-1 md:col-span-2">
          {selected ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-full">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                {(() => { const Icon = TYPE_ICONS[selected.type]; return <Icon size={26} strokeWidth={1.5} className="text-indigo-600" />; })()}
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selected.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{selected.date}</span>
                    {selected.tags.map((t) => <span key={t} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{t}</span>)}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 h-64 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <BookOpen size={36} strokeWidth={1.25} className="mx-auto mb-3" />
                <p className="text-sm">Yozuvni tanlang yoki yangi qo'shing</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ObsidianVault() {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [content, setContent] = useState("");
  const [activeFile, setActiveFile] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState<VaultResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);

  async function loadFiles() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/obsidian?path=/");
      const data = await res.json();
      if (data.configured === false) { setConfigured(false); setError(data.error); }
      else { setConfigured(true); setFiles((data.files || []).map((f: string) => ({ path: f }))); }
    } catch { setError("Server xatosi"); }
    setLoading(false);
  }

  async function openFile(path: string) {
    setActiveFile(path);
    const res = await fetch(`/api/obsidian?path=/${encodeURIComponent(path)}`);
    const data = await res.json();
    setContent(data.content || data.error || "");
  }

  async function doSearch() {
    if (!searchQ.trim()) return;
    setLoading(true);
    const res = await fetch("/api/obsidian", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: searchQ }) });
    const data = await res.json();
    setSearchRes(data.results || []);
    setLoading(false);
  }

  if (configured === false) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <FolderOpen size={40} strokeWidth={1.25} className="mx-auto mb-4 text-gray-300" />
        <p className="text-sm font-semibold text-gray-900 mb-2">Obsidian ulangan emas</p>
        <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">{error}</p>
        <div className="text-left bg-gray-50 rounded-xl p-4 text-xs text-gray-600 space-y-2 max-w-md mx-auto">
          <p className="font-semibold text-gray-900">Ulash uchun:</p>
          <p>1. Obsidian → Community Plugins → <strong>Local REST API</strong> o'rnating</p>
          <p>2. Plugin sozlamalaridan API kalitni oling</p>
          <p>3. Vault ni internet orqali expose qiling (ngrok yoki Cloudflare Tunnel)</p>
          <p>4. Railway Variables'ga qo'shing: <code className="bg-white px-1 rounded">OBSIDIAN_URL</code> va <code className="bg-white px-1 rounded">OBSIDIAN_KEY</code></p>
        </div>
      </div>
    );
  }

  if (configured === null) {
    return (
      <div className="text-center py-16">
        <button onClick={loadFiles} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all mx-auto">
          <FolderOpen size={16} strokeWidth={1.75} /> Obsidian Vault yuklash
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Vault'da qidirish..." className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <button onClick={doSearch} disabled={loading} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all">
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} strokeWidth={1.75} />}
          </button>
        </div>
        {searchRes.length > 0 ? (
          <div className="space-y-1">
            {searchRes.map((r) => (
              <button key={r.filename} onClick={() => openFile(r.filename)}
                className="w-full text-left p-3 rounded-xl border border-gray-100 bg-white hover:border-indigo-200 transition-all">
                <p className="text-sm font-medium text-gray-900 truncate">{r.filename}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.context}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((f) => (
              <button key={f.path} onClick={() => openFile(f.path)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-sm ${
                  activeFile === f.path ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-100 bg-white hover:border-gray-200 text-gray-700"
                }`}>
                {f.path}
              </button>
            ))}
            {files.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-400 text-sm">Fayllar yo'q</div>
            )}
          </div>
        )}
      </div>
      <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-64">
        {activeFile ? (
          <>
            <p className="text-xs font-mono text-indigo-600 mb-4 pb-3 border-b border-gray-100">{activeFile}</p>
            <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">{content}</pre>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">Faylni tanlang</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KnowledgePage() {
  const [tab, setTab] = useState<"local" | "obsidian">("local");

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Hub</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bilimlar bazasi — AI dan so'rash va qidirish mumkin</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab("local")}
          className={`text-sm px-4 py-2 rounded-lg transition-all ${tab === "local" ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          Local Notes
        </button>
        <button onClick={() => setTab("obsidian")}
          className={`text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${tab === "obsidian" ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          <FolderOpen size={14} strokeWidth={1.75} />
          Obsidian Vault
        </button>
      </div>

      {tab === "local" ? <LocalNotes /> : <ObsidianVault />}
    </div>
  );
}

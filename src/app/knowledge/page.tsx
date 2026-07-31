"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Brain, Search, RefreshCw, FileText, FolderOpen, ChevronRight,
  Plus, Send, X, AlertCircle, Zap, BookOpen, Clock, Trash2, Sparkles, Tag,
} from "lucide-react";

type VaultFile = { path: string; stat?: { mtime: number; ctime: number; size: number } };
type SearchResult = { filename: string; score: number; context?: string };
type MemoryItem = { id?: string; title: string; content: string; tags?: string[]; created_at?: string; createdAt?: number };

type Tab = "vault" | "search" | "memory" | "hermes";

export default function KnowledgePage() {
  const [tab, setTab] = useState<Tab>("vault");
  const [configured, setConfigured] = useState<{ obsidian: boolean; hermes: boolean }>({ obsidian: false, hermes: false });

  // Vault
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [openFile, setOpenFile] = useState<{ path: string; content: string } | null>(null);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [path, setPath] = useState("/");

  // Search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Memory / Knowledge DB
  const [memItems, setMemItems] = useState<MemoryItem[]>([]);
  const [memQuery, setMemQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [memLoading, setMemLoading] = useState(false);
  const [memSaving, setMemSaving] = useState(false);
  const [showNewMem, setShowNewMem] = useState(false);
  const [memSemantic, setMemSemantic] = useState(false);
  const [memConfigured, setMemConfigured] = useState(true);

  // Hermes
  const [tools, setTools] = useState<{ name: string; description?: string }[]>([]);
  const [toolName, setToolName] = useState("");
  const [toolArgs, setToolArgs] = useState("{}");
  const [toolResult, setToolResult] = useState("");
  const [toolRunning, setToolRunning] = useState(false);

  const loadVault = useCallback(async (dir = "/") => {
    setVaultLoading(true);
    try {
      const r = await fetch(`/api/obsidian?path=${encodeURIComponent(dir)}`);
      const d = await r.json();
      setConfigured(c => ({ ...c, obsidian: d.configured !== false }));
      const raw: (string | VaultFile)[] = d.files || [];
      setFiles(raw.map(f => (typeof f === "string" ? { path: f } : f)));
    } finally {
      setVaultLoading(false);
    }
  }, []);

  const loadMemory = useCallback(async (q = "") => {
    setMemLoading(true);
    try {
      const url = q ? `/api/knowledge?q=${encodeURIComponent(q)}` : "/api/knowledge";
      const r = await fetch(url);
      const d = await r.json();
      setMemConfigured(d.configured !== false);
      setMemSemantic(Boolean(d.semantic));
      setMemItems(d.items || []);
    } finally {
      setMemLoading(false);
    }
  }, []);

  const loadHermes = useCallback(async () => {
    try {
      const r = await fetch("/api/mcp");
      const d = await r.json();
      setConfigured(c => ({ ...c, hermes: d.configured !== false }));
      setTools(d.tools || []);
    } catch {}
  }, []);

  useEffect(() => { loadVault(); loadMemory(); loadHermes(); }, [loadVault, loadMemory, loadHermes]);

  async function openVaultFile(filePath: string) {
    if (filePath.endsWith("/")) { setPath(filePath); loadVault(filePath); return; }
    const r = await fetch(`/api/obsidian?file=${encodeURIComponent(filePath)}`);
    const d = await r.json();
    if (d.content !== undefined) setOpenFile({ path: filePath, content: d.content });
  }

  async function doSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    const r = await fetch(`/api/obsidian?search=${encodeURIComponent(query)}`);
    const d = await r.json();
    setResults(d.results || []);
    setSearching(false);
  }

  async function saveMem() {
    if (!newTitle.trim() || !newContent.trim()) return;
    setMemSaving(true);
    try {
      const tags = newTags.split(",").map(t => t.trim()).filter(Boolean);
      await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent, tags }),
      });
      setNewTitle(""); setNewContent(""); setNewTags(""); setShowNewMem(false);
      loadMemory();
    } finally {
      setMemSaving(false);
    }
  }

  async function deleteMem(id: string | number) {
    await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
    setMemItems(prev => prev.filter(m => String(m.id) !== String(id)));
  }

  async function runTool() {
    if (!toolName) return;
    setToolRunning(true); setToolResult("");
    try {
      const r = await fetch("/api/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolName, args: JSON.parse(toolArgs || "{}") }),
      });
      const d = await r.json();
      setToolResult(JSON.stringify(d, null, 2));
    } catch (e) {
      setToolResult(String(e));
    }
    setToolRunning(false);
  }

  const tabs: { id: Tab; label: string; icon: typeof Brain }[] = [
    { id: "vault", label: "Vault", icon: FolderOpen },
    { id: "search", label: "Qidiruv", icon: Search },
    { id: "memory", label: "Xotira", icon: Brain },
    { id: "hermes", label: "Hermes", icon: Zap },
  ];

  return (
    <div className="fade-in max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Hub</h1>
          <p className="text-sm text-gray-500 mt-0.5">Obsidian vault · Supabase pgvector · Hermes MCP</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${configured.obsidian ? "border-purple-200 bg-purple-50 text-purple-700" : "border-gray-200 bg-gray-50 text-gray-400"}`}>
            <Brain size={11} /> Obsidian {configured.obsidian ? "●" : "○"}
          </span>
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${configured.hermes ? "border-orange-200 bg-orange-50 text-orange-700" : "border-gray-200 bg-gray-50 text-gray-400"}`}>
            <Zap size={11} /> Hermes {configured.hermes ? "●" : "○"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon size={14} strokeWidth={1.75} />{t.label}
          </button>
        ))}
      </div>

      {/* VAULT TAB */}
      {tab === "vault" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {path !== "/" && (
                  <button onClick={() => { setPath("/"); loadVault("/"); }} className="p-1 text-gray-400 hover:text-gray-600">
                    <ChevronRight size={14} className="rotate-180" />
                  </button>
                )}
                <span className="text-xs font-mono text-gray-500 truncate">{path}</span>
              </div>
              <button onClick={() => loadVault(path)} className="p-1.5 text-gray-400 hover:text-gray-600">
                <RefreshCw size={13} strokeWidth={1.75} />
              </button>
            </div>

            {!configured.obsidian ? (
              <div className="p-6 text-center">
                <AlertCircle size={32} strokeWidth={1.25} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500 mb-1">Vault ulanmagan</p>
                <p className="text-xs text-gray-400">Railway&apos;da <code className="bg-gray-100 px-1 rounded">GITHUB_TOKEN</code> o&apos;rnating</p>
                <a href="/settings" className="mt-3 inline-block text-xs text-indigo-600 hover:underline">Sozlamalar →</a>
              </div>
            ) : vaultLoading ? (
              <div className="p-6 text-center text-xs text-gray-400">Yuklanmoqda...</div>
            ) : files.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">Fayllar topilmadi</div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {files.map(f => {
                  const name = f.path.split("/").filter(Boolean).pop() || f.path;
                  const isDir = f.path.endsWith("/");
                  return (
                    <button key={f.path} onClick={() => openVaultFile(f.path)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                      {isDir
                        ? <FolderOpen size={14} strokeWidth={1.75} className="text-yellow-500 flex-shrink-0" />
                        : <FileText size={14} strokeWidth={1.75} className="text-gray-400 flex-shrink-0" />}
                      <span className="text-xs text-gray-700 truncate">{name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {openFile ? (
              <>
                <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-500 truncate">{openFile.path}</span>
                  <button onClick={() => setOpenFile(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </div>
                <div className="p-5 overflow-y-auto max-h-[500px]">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{openFile.content}</pre>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <BookOpen size={40} strokeWidth={1.25} className="text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Chap tomondagi faylni tanlang</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEARCH TAB */}
      {tab === "search" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder="Vault ichidan qidiring..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <button onClick={doSearch} disabled={!query.trim() || searching}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm rounded-xl transition-all flex items-center gap-2">
              {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              Qidirish
            </button>
          </div>

          {!configured.obsidian && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-xs text-yellow-700 flex items-center gap-2">
              <AlertCircle size={14} /> Vault ulanmagan — lokal xotiradan qidirish ishlaydi
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <button key={i} onClick={() => openVaultFile(r.filename)}
                  className="w-full bg-white border border-gray-100 hover:border-indigo-200 rounded-xl px-4 py-3.5 text-left transition-all shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} strokeWidth={1.75} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate">{r.filename.split("/").pop()}</span>
                    <span className="ml-auto text-xs text-gray-400">{Math.round((r.score || 0) * 100)}%</span>
                  </div>
                  {r.context && <p className="text-xs text-gray-500 line-clamp-2 ml-5">{r.context}</p>}
                </button>
              ))}
            </div>
          )}

          {searching && <div className="text-center py-8 text-sm text-gray-400">Qidirilmoqda...</div>}
          {!searching && results.length === 0 && query && <div className="text-center py-8 text-sm text-gray-400">Hech narsa topilmadi</div>}
        </div>
      )}

      {/* MEMORY TAB */}
      {tab === "memory" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={memQuery} onChange={e => setMemQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadMemory(memQuery)}
                placeholder="Semantik qidiruv (pgvector)..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <button onClick={() => loadMemory(memQuery)} className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all">
              <RefreshCw size={14} strokeWidth={1.75} />
            </button>
            <button onClick={() => setShowNewMem(v => !v)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all flex items-center gap-2">
              <Plus size={14} /> Yangi
            </button>
          </div>

          {!memConfigured && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle size={13} /> Supabase ulanmagan — <code>pari_knowledge</code> jadvali kerak
            </div>
          )}

          {memSemantic && memQuery && (
            <div className="flex items-center gap-1.5 text-xs text-purple-600">
              <Sparkles size={11} /> pgvector semantik natijalar
            </div>
          )}

          {showNewMem && (
            <div className="bg-white border border-indigo-200 rounded-2xl p-5 space-y-3 shadow-sm">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="Sarlavha"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="Kontent..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
              <input value={newTags} onChange={e => setNewTags(e.target.value)}
                placeholder="Teglar (vergul bilan): ai, arxitektura, notes"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowNewMem(false); setNewTitle(""); setNewContent(""); setNewTags(""); }}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">Bekor</button>
                <button onClick={saveMem} disabled={memSaving || !newTitle.trim() || !newContent.trim()}
                  className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg transition-all flex items-center gap-1.5">
                  {memSaving ? <RefreshCw size={11} className="animate-spin" /> : <Send size={12} />}
                  Saqlash
                </button>
              </div>
            </div>
          )}

          {memLoading ? (
            <div className="text-center py-8 text-sm text-gray-400">Yuklanmoqda...</div>
          ) : memItems.length === 0 ? (
            <div className="text-center py-12">
              <Brain size={40} strokeWidth={1.25} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">Xotira bo'sh</p>
              <p className="text-xs text-gray-400 mt-1">Yangi bilim qo'shing — agentlar undan foydalanadi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memItems.map((m, i) => (
                <div key={m.id || i} className="group bg-white border border-gray-100 rounded-xl px-4 py-3.5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Brain size={14} strokeWidth={1.75} className="text-purple-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{m.title}</p>
                        <button onClick={() => m.id && deleteMem(m.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all flex-shrink-0">
                          <Trash2 size={12} strokeWidth={1.75} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-3">{m.content}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {m.tags && m.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <Tag size={10} strokeWidth={1.75} className="text-gray-400" />
                            {m.tags.map(tag => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{tag}</span>
                            ))}
                          </div>
                        )}
                        {(m.created_at || m.createdAt) && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                            <Clock size={10} />
                            {new Date(m.created_at || m.createdAt!).toLocaleDateString("uz")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HERMES TAB */}
      {tab === "hermes" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">MCP Vositalar</p>
              <button onClick={loadHermes} className="p-1.5 text-gray-400 hover:text-gray-600">
                <RefreshCw size={13} strokeWidth={1.75} />
              </button>
            </div>

            {!configured.hermes ? (
              <div className="p-6 text-center">
                <AlertCircle size={32} strokeWidth={1.25} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500 mb-1">Vositalar mavjud emas</p>
                <p className="text-xs text-gray-400">Bu odatiy holat emas — server bilan bog&apos;lanishni tekshiring</p>
                <a href="/settings" className="mt-3 inline-block text-xs text-indigo-600 hover:underline">Sozlamalar →</a>
              </div>
            ) : tools.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">Vositalar topilmadi</div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {tools.map(t => (
                  <button key={t.name} onClick={() => setToolName(t.name)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${toolName === t.name ? "bg-orange-50" : ""}`}>
                    <Zap size={14} strokeWidth={1.75} className="text-orange-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-gray-800">{t.name}</p>
                      {t.description && <p className="text-xs text-gray-400 truncate">{t.description}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-900">Vositani ishlatish</p>
            </div>
            <div className="p-4 space-y-3">
              <input value={toolName} onChange={e => setToolName(e.target.value)}
                placeholder="tool_name"
                className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200" />
              <textarea value={toolArgs} onChange={e => setToolArgs(e.target.value)}
                placeholder='{"key": "value"}'
                rows={4}
                className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none" />
              <button onClick={runTool} disabled={!toolName || toolRunning}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                {toolRunning ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                Ishlatish
              </button>
              {toolResult && (
                <pre className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded-xl overflow-x-auto max-h-40">{toolResult}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

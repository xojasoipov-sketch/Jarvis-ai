"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload, FileText, FileCode2, FileJson, FileSpreadsheet, Image as ImageIcon,
  Film, Sparkles, Trash2, FolderOpen, type LucideIcon, BookOpen, RefreshCw, Check,
} from "lucide-react";

type FileMeta = { name: string; size: string; date: string };

const EXT_ICONS: Record<string, LucideIcon> = {
  pdf: FileText, txt: FileText, md: FileText, js: FileCode2, ts: FileCode2, tsx: FileCode2,
  py: FileCode2, json: FileJson, csv: FileSpreadsheet, png: ImageIcon, jpg: ImageIcon, mp4: Film,
  docx: FileText, doc: FileText,
};

const PARSEABLE_EXTS = new Set(["pdf", "docx", "doc", "txt", "md", "csv", "json", "yaml", "yml", "html", "css", "js", "ts", "tsx", "py"]);

export default function FilesPage() {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [configured, setConfigured] = useState(true);
  const [listError, setListError] = useState("");
  const [selected, setSelected] = useState<FileMeta | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [savingToKnowledge, setSavingToKnowledge] = useState(false);
  const [savedToKnowledge, setSavedToKnowledge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFiles(data.files || []);
      setConfigured(Boolean(data.configured));
      setListError(data.error || "");
    } catch { setListError("Yuklashda xato"); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFiles = Array.from(e.target.files || []);
    setUploading(true);
    for (const f of uploadedFiles) {
      const form = new FormData();
      form.append("file", f);
      try {
        const res = await fetch("/api/files", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) alert(`${f.name}: ${data.error || "Xato"}`);
      } catch { alert(`${f.name}: yuklashda xato`); }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    load();
  }

  async function selectFile(f: FileMeta) {
    setSelected(f);
    setAiAnswer("");
    setAiQuery("");
    setContent(null);
    setSavedToKnowledge(false);

    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    if (!PARSEABLE_EXTS.has(ext)) return;

    if (["pdf", "docx", "doc"].includes(ext)) {
      // Use parser for binary formats
      setParseLoading(true);
      try {
        const res = await fetch("/api/files/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: f.name }),
        });
        const data = await res.json();
        setContent(data.text || (data.error ? `Xato: ${data.error}` : null));
      } catch { setContent(null); }
      setParseLoading(false);
    } else {
      try {
        const res = await fetch(`/api/files?read=${encodeURIComponent(f.name)}`);
        const data = await res.json();
        setContent(data.content);
      } catch { setContent(null); }
    }
  }

  async function removeFile(name: string) {
    setFiles((p) => p.filter((f) => f.name !== name));
    if (selected?.name === name) { setSelected(null); setContent(null); }
    try {
      await fetch(`/api/files?name=${encodeURIComponent(name)}`, { method: "DELETE" });
    } catch { load(); }
  }

  async function analyzeWithAI() {
    if (!content || !aiQuery.trim() || !selected) return;
    setAiLoading(true);
    setAiAnswer("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Fayl: ${selected.name}\n\nMazmun:\n${content.slice(0, 15000)}\n\nSavol: ${aiQuery}` }]
        }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value);
        setAiAnswer(text);
      }
    } catch { setAiAnswer("Xato."); }
    setAiLoading(false);
  }

  async function saveToKnowledge() {
    if (!content || !selected) return;
    setSavingToKnowledge(true);
    try {
      const ext = selected.name.split(".").pop()?.toLowerCase() || "";
      await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selected.name.replace(/\.[^.]+$/, ""),
          content: content.slice(0, 8000),
          tags: [ext, "file-import"],
        }),
      });
      setSavedToKnowledge(true);
      setTimeout(() => setSavedToKnowledge(false), 3000);
    } catch {}
    setSavingToKnowledge(false);
  }

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Files</h1>
          <p className="text-sm text-gray-500 mt-0.5">{files.length} ta fayl — PDF, DOCX, TXT va boshqalarni AI bilan tahlil qilish</p>
        </div>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all">
          <Upload size={15} strokeWidth={1.75} /> {uploading ? "Yuklanmoqda..." : "Yuklash"}
        </button>
        <input ref={inputRef} type="file" multiple accept=".pdf,.docx,.doc,.txt,.md,.csv,.json,.yaml,.yml,.html,.js,.ts,.tsx,.py" className="hidden" onChange={handleUpload} />
      </div>

      {!configured && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
          Supabase ulanmagan — fayllar saqlanmaydi.
        </div>
      )}
      {configured && listError && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">{listError}</div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* File list */}
        <div className="col-span-1 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..."
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />

          <div className="space-y-1.5">
            {filtered.map(f => {
              const ext = f.name.split(".").pop() || "txt";
              const Icon = EXT_ICONS[ext] || FileText;
              const parseable = PARSEABLE_EXTS.has(ext);
              return (
                <button key={f.name} onClick={() => selectFile(f)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.name === f.name ? "border-indigo-300 bg-indigo-50" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                  <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={1.5} className={`flex-shrink-0 ${parseable ? "text-indigo-500" : "text-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                      <div className="flex gap-2 text-xs text-gray-400 mt-0.5">
                        <span>{f.size}</span><span>·</span><span>{f.date}</span>
                        {parseable && <span className="text-indigo-400">· AI</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">Fayl topilmadi</div>
            )}
          </div>
        </div>

        {/* File viewer + AI */}
        <div className="col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                  {(() => { const ext = selected.name.split(".").pop() || "txt"; const Icon = EXT_ICONS[ext] || FileText; return <Icon size={26} strokeWidth={1.5} className="text-gray-600" />; })()}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                    <p className="text-xs text-gray-500">{selected.size} · {selected.date}</p>
                  </div>
                  {content && (
                    <button onClick={saveToKnowledge} disabled={savingToKnowledge || savedToKnowledge}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all mr-1 ${savedToKnowledge ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200"}`}>
                      {savingToKnowledge ? <RefreshCw size={11} className="animate-spin" /> : savedToKnowledge ? <Check size={11} /> : <BookOpen size={11} />}
                      {savedToKnowledge ? "Saqlandi" : "Knowledge'ga"}
                    </button>
                  )}
                  <button onClick={() => removeFile(selected.name)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </div>

                {parseLoading ? (
                  <div className="flex items-center justify-center py-10 text-sm text-gray-400 gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Fayl o&apos;qilmoqda...
                  </div>
                ) : content ? (
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 rounded-xl p-4 max-h-52 overflow-y-auto leading-relaxed">{content.slice(0, 3000)}{content.length > 3000 ? "\n\n... (qisqartirildi)" : ""}</pre>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">
                    {PARSEABLE_EXTS.has(selected.name.split(".").pop() || "") ? "O'qib bo'lmadi" : "Bu fayl turi uchun matn ko'rinishi yo'q"}
                  </p>
                )}
              </div>

              {content && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles size={15} strokeWidth={1.75} className="text-indigo-600" /> AI bilan tahlil
                  </p>
                  <div className="flex gap-2">
                    <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && analyzeWithAI()}
                      placeholder="Bu hujjat haqida savol bering..."
                      className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
                    <button onClick={analyzeWithAI} disabled={aiLoading || !aiQuery.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm rounded-xl transition-all">
                      {aiLoading ? "..." : "So'rash"}
                    </button>
                  </div>
                  {aiAnswer && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {aiAnswer}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 h-64 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-300 transition-all"
              onClick={() => inputRef.current?.click()}>
              <FolderOpen size={36} strokeWidth={1.25} className="text-gray-400" />
              <p className="text-sm text-gray-500">PDF, DOCX, TXT, MD va boshqa fayllarni yuklang</p>
              <p className="text-xs text-gray-400">AI bilan tahlil · Knowledge Hub'ga saqlash</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

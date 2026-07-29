"use client";
import { useState, useRef } from "react";
import {
  Upload, FileText, FileCode2, FileJson, FileSpreadsheet, Image as ImageIcon,
  Film, Sparkles, Trash2, FolderOpen, type LucideIcon,
} from "lucide-react";

type File = { id: number; name: string; type: string; size: string; date: string; content?: string };

const EXT_ICONS: Record<string, LucideIcon> = {
  pdf: FileText, txt: FileText, md: FileText, js: FileCode2, ts: FileCode2, tsx: FileCode2,
  py: FileCode2, json: FileJson, csv: FileSpreadsheet, png: ImageIcon, jpg: ImageIcon, mp4: Film,
};

const INIT_FILES: File[] = [
  { id: 1, name: "Pari AI Arxitektura.md", type: "md", size: "12 KB", date: "2026-07-29", content: "# Pari AI Arxitektura\n\nKo'p agentli tizim..." },
  { id: 2, name: "Biznes plan 2026.txt", type: "txt", size: "8 KB", date: "2026-07-28", content: "Biznes rejasi:\n1. MVP yaratish\n2. Beta foydalanuvchilar..." },
  { id: 3, name: "API dokumentatsiya.json", type: "json", size: "24 KB", date: "2026-07-27" },
  { id: 4, name: "Marketing strategiya.md", type: "md", size: "6 KB", date: "2026-07-26" },
  { id: 5, name: "Statistika.csv", type: "csv", size: "45 KB", date: "2026-07-25" },
];

export default function FilesPage() {
  const [files, setFiles] = useState<File[]>(INIT_FILES);
  const [selected, setSelected] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFiles = Array.from(e.target.files || []);
    const newFiles: File[] = uploadedFiles.map(f => ({
      id: Date.now() + Math.random(),
      name: f.name,
      type: f.name.split(".").pop() || "txt",
      size: `${(f.size / 1024).toFixed(1)} KB`,
      date: new Date().toISOString().slice(0, 10),
    }));
    setFiles(p => [...newFiles, ...p]);
  }

  async function analyzeWithAI() {
    if (!selected?.content || !aiQuery.trim()) return;
    setAiLoading(true);
    setAiAnswer("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Fayl: ${selected.name}\n\nMazmun:\n${selected.content}\n\nSavol: ${aiQuery}` }]
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

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f1ea]">Files</h1>
          <p className="text-sm text-[#7d7870] mt-0.5">{files.length} ta fayl — AI bilan tahlil qilish mumkin</p>
        </div>
        <button onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-[#ff6a1a] hover:bg-[#e85a0f] text-white text-sm font-medium rounded-xl transition-all">
          <Upload size={15} strokeWidth={1.75} /> Yuklash
        </button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* File list */}
        <div className="col-span-1 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..."
            className="w-full px-3 py-2.5 bg-[#141316] border border-white/[0.12] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30" />

          <div className="space-y-1.5">
            {filtered.map(f => {
              const ext = f.type || "txt";
              const Icon = EXT_ICONS[ext] || FileText;
              return (
                <button key={f.id} onClick={() => { setSelected(f); setAiAnswer(""); setAiQuery(""); }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === f.id ? "border-[#ff6a1a]/40 bg-[#ff6a1a]/10" : "border-white/[0.08] bg-[#141316] hover:border-white/[0.12]"}`}>
                  <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={1.5} className="text-[#a39d92] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f5f1ea] truncate">{f.name}</p>
                      <div className="flex gap-2 text-xs text-[#5c584f] mt-0.5">
                        <span>{f.size}</span><span>·</span><span>{f.date}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-[#5c584f] text-sm">Fayl topilmadi</div>
            )}
          </div>
        </div>

        {/* File viewer + AI */}
        <div className="col-span-2 space-y-4">
          {selected ? (
            <>
              <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/[0.08]">
                  {(() => { const Icon = EXT_ICONS[selected.type] || FileText; return <Icon size={26} strokeWidth={1.5} className="text-[#a39d92]" />; })()}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#f5f1ea]">{selected.name}</p>
                    <p className="text-xs text-[#7d7870]">{selected.size} · {selected.date}</p>
                  </div>
                  <button onClick={() => setFiles(p => p.filter(f => f.id !== selected.id))}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={15} strokeWidth={1.75} /></button>
                </div>
                {selected.content ? (
                  <pre className="text-xs text-[#cfc9bd] whitespace-pre-wrap font-mono bg-[#0a0a0c] rounded-xl p-4 max-h-40 overflow-y-auto">{selected.content}</pre>
                ) : (
                  <p className="text-sm text-[#5c584f] text-center py-6">Fayl ko'rib chiqish uchun kontent yo'q</p>
                )}
              </div>

              {selected.content && (
                <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-5">
                  <p className="text-sm font-semibold text-[#f5f1ea] mb-3 flex items-center gap-2"><Sparkles size={15} strokeWidth={1.75} className="text-[#ff8a3d]" /> AI bilan tahlil</p>
                  <div className="flex gap-2">
                    <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && analyzeWithAI()}
                      placeholder="Bu fayl haqida savol bering..."
                      className="flex-1 px-3 py-2.5 bg-[#0a0a0c] border border-white/[0.12] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30" />
                    <button onClick={analyzeWithAI} disabled={aiLoading || !aiQuery.trim()}
                      className="px-4 py-2.5 bg-[#ff6a1a] hover:bg-[#e85a0f] disabled:opacity-40 text-white text-sm rounded-xl transition-all">
                      {aiLoading ? "..." : "So'rash"}
                    </button>
                  </div>
                  {aiAnswer && (
                    <div className="mt-3 p-4 bg-[#0a0a0c] rounded-xl text-sm text-[#cfc9bd] leading-relaxed whitespace-pre-wrap">
                      {aiAnswer}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#141316] rounded-2xl border border-dashed border-white/[0.12] h-64 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#ff6a1a]/40 transition-all"
              onClick={() => inputRef.current?.click()}>
              <FolderOpen size={36} strokeWidth={1.25} className="text-[#5c584f]" />
              <p className="text-sm text-[#7d7870]">Fayl tanlang yoki bu yerga tashlang</p>
              <p className="text-xs text-[#5c584f]">AI bilan tahlil qilish uchun faylni tanlang</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

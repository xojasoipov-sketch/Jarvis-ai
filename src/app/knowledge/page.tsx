"use client";
import { useState } from "react";
import { Plus, Sparkles, StickyNote, Globe, FileText, BookOpen } from "lucide-react";

type Doc = { id: number; title: string; type: "note" | "web" | "file"; content: string; tags: string[]; date: string };

const INIT_DOCS: Doc[] = [
  { id: 1, title: "Pari AI Arxitektura", type: "note", content: "Ko'p agentli tizim: CEO, Researcher, Coder, Analyst, Writer, Marketing, DevOps, Assistant agentlari parallel ishlaydi. Multi-provider fallback: OpenRouter → Mistral → Groq → Cerebras.", tags: ["AI", "Arxitektura"], date: "2026-07-29" },
  { id: 2, title: "Business Model Canvas", type: "note", content: "Value Proposition: Bitta AI platformasi barcha biznes vazifalarini bajaradi. Mijozlar: Kichik va o'rta bizneslar. Daromad: Subscription + API qo'ng'iroqlari.", tags: ["Biznes", "Model"], date: "2026-07-28" },
  { id: 3, title: "Railway Deploy Qo'llanma", type: "web", content: "Railway.app — Node.js loyihalar uchun eng oson deploy platformasi. RAILPACK yoki NIXPACKS builder ishlatiladi. Env vars dashboard orqali o'rnatiladi.", tags: ["DevOps", "Railway"], date: "2026-07-27" },
];

export default function KnowledgePage() {
  const [docs, setDocs] = useState<Doc[]>(INIT_DOCS);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", content: "", tags: "" });
  const [selected, setSelected] = useState<Doc | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.content.toLowerCase().includes(search.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  function addDoc() {
    if (!newDoc.title.trim()) return;
    setDocs(prev => [...prev, {
      id: Date.now(), title: newDoc.title, type: "note", content: newDoc.content,
      tags: newDoc.tags.split(",").map(t => t.trim()).filter(Boolean),
      date: new Date().toISOString().slice(0, 10),
    }]);
    setNewDoc({ title: "", content: "", tags: "" });
    setShowNew(false);
  }

  async function askAI() {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiAnswer("");
    const context = docs.map(d => `[${d.title}]: ${d.content}`).join("\n\n");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Knowledge base:\n${context}\n\nSavol: ${aiQuery}` }]
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
    } catch { setAiAnswer("Xato yuz berdi."); }
    setAiLoading(false);
  }

  const TYPE_ICONS = { note: StickyNote, web: Globe, file: FileText };

  return (
    <div className="fade-in max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f1ea]">Knowledge Hub</h1>
          <p className="text-sm text-[#7d7870] mt-0.5">Bilimlar bazasi — AI dan so'rash va qidirish mumkin</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-[#ff6a1a] hover:bg-[#e85a0f] text-white text-sm font-medium rounded-xl transition-all">
          <Plus size={15} strokeWidth={2} /> Yangi yozuv
        </button>
      </div>

      {/* AI Search */}
      <div className="bg-gradient-to-br from-[#ff6a1a]/10 to-transparent rounded-2xl border border-[#ff6a1a]/20 p-5">
        <p className="text-sm font-semibold text-[#f5f1ea] mb-3 flex items-center gap-2"><Sparkles size={15} strokeWidth={1.75} className="text-[#ff8a3d]" /> Knowledge base'dan so'rash</p>
        <div className="flex gap-2">
          <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && askAI()}
            placeholder="Savol bering... (masalan: 'Pari AI qanday ishlaydi?')"
            className="flex-1 px-4 py-2.5 bg-[#141316] border border-[#ff6a1a]/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30" />
          <button onClick={askAI} disabled={aiLoading || !aiQuery.trim()}
            className="px-5 py-2.5 bg-[#ff6a1a] hover:bg-[#e85a0f] disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
            {aiLoading ? "..." : "So'rash"}
          </button>
        </div>
        {aiAnswer && (
          <div className="mt-4 p-4 bg-[#141316] rounded-xl border border-[#ff6a1a]/20 text-sm text-[#cfc9bd] leading-relaxed whitespace-pre-wrap">
            {aiAnswer}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Doc list */}
        <div className="col-span-1 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="w-full px-3 py-2.5 bg-[#141316] border border-white/[0.12] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30" />

          {showNew && (
            <div className="bg-[#141316] rounded-2xl border border-[#ff6a1a]/30 p-4 space-y-2">
              <input value={newDoc.title} onChange={e => setNewDoc(p => ({ ...p, title: e.target.value }))}
                placeholder="Sarlavha..." className="w-full px-3 py-2 bg-[#0a0a0c] border border-white/[0.12] rounded-lg text-sm focus:outline-none" />
              <textarea value={newDoc.content} onChange={e => setNewDoc(p => ({ ...p, content: e.target.value }))}
                placeholder="Mazmun..." rows={3} className="w-full px-3 py-2 bg-[#0a0a0c] border border-white/[0.12] rounded-lg text-sm resize-none focus:outline-none" />
              <input value={newDoc.tags} onChange={e => setNewDoc(p => ({ ...p, tags: e.target.value }))}
                placeholder="Teglar (vergul bilan)..." className="w-full px-3 py-2 bg-[#0a0a0c] border border-white/[0.12] rounded-lg text-sm focus:outline-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2 text-xs text-[#a39d92] hover:bg-[#1e1d21] rounded-lg">Bekor</button>
                <button onClick={addDoc} className="flex-1 py-2 bg-[#ff6a1a] text-white text-xs rounded-lg">Saqlash</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {filtered.map(doc => (
              <button key={doc.id} onClick={() => setSelected(doc)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === doc.id ? "border-[#ff6a1a]/40 bg-[#ff6a1a]/10" : "border-white/[0.08] bg-[#141316] hover:border-white/[0.12]"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {(() => { const Icon = TYPE_ICONS[doc.type]; return <Icon size={13} strokeWidth={1.75} className="text-[#7d7870]" />; })()}
                  <p className="text-sm font-medium text-[#f5f1ea] truncate">{doc.title}</p>
                </div>
                <p className="text-xs text-[#7d7870] line-clamp-2">{doc.content}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {doc.tags.map(t => <span key={t} className="text-xs bg-[#1e1d21] text-[#7d7870] px-1.5 py-0.5 rounded">{t}</span>)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Doc viewer */}
        <div className="col-span-2">
          {selected ? (
            <div className="bg-[#141316] rounded-2xl border border-white/[0.08] shadow-sm p-6 h-full">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.08]">
                {(() => { const Icon = TYPE_ICONS[selected.type]; return <Icon size={26} strokeWidth={1.5} className="text-[#ff8a3d]" />; })()}
                <div>
                  <h2 className="text-lg font-bold text-[#f5f1ea]">{selected.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#7d7870]">{selected.date}</span>
                    {selected.tags.map(t => <span key={t} className="text-xs bg-[#ff6a1a]/10 text-[#ff8a3d] px-2 py-0.5 rounded-full">{t}</span>)}
                  </div>
                </div>
              </div>
              <p className="text-sm text-[#cfc9bd] leading-relaxed whitespace-pre-wrap">{selected.content}</p>
            </div>
          ) : (
            <div className="bg-[#141316] rounded-2xl border border-white/[0.08] h-64 flex items-center justify-center">
              <div className="text-center text-[#5c584f]">
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

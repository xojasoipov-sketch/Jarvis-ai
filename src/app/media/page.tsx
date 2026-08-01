"use client";
import { useState, useRef } from "react";
import { Image, Video, Mic, User, Music, Subtitles, Scissors, Maximize2, Languages, Play, Pause, Download, Loader2, X, Wand2, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

type ToolId = "image" | "video" | "voice" | "avatar" | "music" | "subtitle" | "cut" | "upscale" | "translate";
type Tool = { id: ToolId; label: string; desc: string; icon: LucideIcon };

const TOOLS: Tool[] = [
  { id: "image", label: "AI Rasm", desc: "Matn orqali rasm yarating", icon: Image },
  { id: "video", label: "Video tahrir", desc: "Video skript va tahrir", icon: Video },
  { id: "voice", label: "Ovoz (TTS)", desc: "Matnni ovozga aylantiring", icon: Mic },
  { id: "avatar", label: "AI Avatar", desc: "Skript → Ovoz → Avatar", icon: User },
  { id: "music", label: "Musiqa", desc: "AI musiqa brief", icon: Music },
  { id: "subtitle", label: "Subtitrlar", desc: "Video uchun subtitr", icon: Subtitles },
  { id: "cut", label: "Video qisqartir", desc: "Uzun videoni kliplarga", icon: Scissors },
  { id: "upscale", label: "Sifat oshirish", desc: "Rasm/video sifati", icon: Maximize2 },
  { id: "translate", label: "Tarjima", desc: "Video/audio tarjima", icon: Languages },
];

function TTSPanel({ label, hint }: { label: string; hint: string }) {
  const [text, setText] = useState("");
  const [lang, setLang] = useState("uz");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function generate() {
    if (!text.trim()) return;
    setLoading(true); setAudioUrl(null);
    try {
      const res = await fetch(`/api/tts?text=${encodeURIComponent(text.slice(0, 500))}&lang=${lang}`);
      if (!res.ok) throw new Error("TTS xato");
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch { alert("Ovoz yaratishda xato."); }
    finally { setLoading(false); }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{hint}</p>
      <select value={lang} onChange={e => setLang(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
        <option value="uz">O'zbek</option><option value="ru">Rus</option><option value="en">Ingliz</option>
      </select>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder={`${label} uchun matn...`} rows={4} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none" />
      <button onClick={generate} disabled={loading || !text.trim()} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg disabled:opacity-50">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Ovoz yaratish
      </button>
      {audioUrl && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
          <button onClick={togglePlay} className="p-2 bg-gray-900 text-white rounded-lg">{playing ? <Pause size={14} /> : <Play size={14} />}</button>
          <div className="flex-1"><p className="text-xs font-medium text-gray-700">Ovoz tayyor</p></div>
          <a href={audioUrl} download="audio.mp3" className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600"><Download size={12} /> Yuklab olish</a>
        </div>
      )}
    </div>
  );
}

function ChatPanel({ tool }: { tool: Tool }) {
  const router = useRouter();
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{tool.desc}</p>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Qo'shimcha ma'lumot..." rows={3} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none" />
      <button onClick={() => router.push(`/chat?q=${encodeURIComponent((text || tool.label) as string)}`)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg"><Wand2 size={14} /> AI bilan boshlash</button>
    </div>
  );
}

export default function MediaPage() {
  const [active, setActive] = useState<ToolId | null>(null);
  const activeTool = TOOLS.find(t => t.id === active);

  function renderPanel(tool: Tool) {
    if (tool.id === "voice" || tool.id === "avatar") return <TTSPanel label={tool.label} hint={tool.desc} />;
    return <ChatPanel tool={tool} />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Media Studio</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI bilan kontent — rasm, video, ovoz, avatar, musiqa</p>
      </div>
      {activeTool && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 rounded-lg"><activeTool.icon size={16} className="text-gray-700" /></div>
              <div><p className="text-sm font-semibold text-gray-900">{activeTool.label}</p><p className="text-xs text-gray-400">{activeTool.desc}</p></div>
            </div>
            <button onClick={() => setActive(null)} className="p-1.5 text-gray-400"><X size={14} /></button>
          </div>
          {renderPanel(activeTool)}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TOOLS.map(t => {
          const Icon = t.icon; const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => setActive(isActive ? null : t.id)}
              className={`bg-white border rounded-xl p-4 text-left hover:shadow-sm ${isActive ? "border-gray-900 shadow-sm" : "border-gray-100 hover:border-gray-300"}`}>
              <div className={`p-2 rounded-lg mb-3 w-fit ${isActive ? "bg-gray-900" : "bg-gray-100"}`}><Icon size={18} className={isActive ? "text-white" : "text-gray-700"} /></div>
              <p className="text-sm font-semibold text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

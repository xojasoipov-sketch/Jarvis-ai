"use client";
import { useState, useRef } from "react";
import {
  Image, Video, Mic, User, Music, Subtitles, Scissors, Maximize2, Languages,
  Play, Pause, Download, Copy, Check, Loader2, ChevronRight, X, Wand2,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

type ToolId = "image" | "video" | "voice" | "avatar" | "music" | "subtitle" | "cut" | "upscale" | "translate";

type Tool = { id: ToolId; label: string; desc: string; icon: LucideIcon };

const TOOLS: Tool[] = [
  { id: "image",    label: "AI Rasm",          desc: "Matn orqali rasm yarating",       icon: Image },
  { id: "video",    label: "Video tahrir",      desc: "Video skript va tahrirga yordam",  icon: Video },
  { id: "voice",    label: "Ovoz (TTS)",        desc: "Matnni ovozga aylantiring",        icon: Mic },
  { id: "avatar",   label: "AI Avatar",         desc: "Skript → Ovoz → Avatar video",    icon: User },
  { id: "music",    label: "Musiqa",            desc: "AI musiqa brief generatori",       icon: Music },
  { id: "subtitle", label: "Subtitrlar",        desc: "Video uchun subtitr yarating",     icon: Subtitles },
  { id: "cut",      label: "Video qisqartir",   desc: "Uzun videoni qisqa kliplarga",     icon: Scissors },
  { id: "upscale",  label: "Sifat oshirish",    desc: "Rasm/video sifatini oshiring",     icon: Maximize2 },
  { id: "translate",label: "Tarjima",           desc: "Video/audio tarjima qiling",       icon: Languages },
];

/* ─── TTS Panel (voice + avatar) ─── */
function TTSPanel({ label, hint }: { label: string; hint: string }) {
  const [text, setText] = useState("");
  const [lang, setLang] = useState("uz");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    setAudioUrl(null);
    try {
      const res = await fetch(`/api/tts?text=${encodeURIComponent(text.slice(0, 500))}&lang=${lang}`);
      if (!res.ok) throw new Error("TTS xato");
      const blob = await res.blob();
      setAudioUrl(URL.createObjectURL(blob));
    } catch { alert("Ovoz yaratishda xato. ELEVENLABS_API_KEY sozlanganligini tekshiring."); }
    finally { setLoading(false); }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  }

  function download() {
    if (!audioUrl) return;
    const a = document.createElement("a"); a.href = audioUrl; a.download = "audio.mp3"; a.click();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{hint}</p>
      <select value={lang} onChange={e => setLang(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900">
        <option value="uz">O'zbek</option>
        <option value="ru">Rus</option>
        <option value="en">Ingliz</option>
      </select>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`${label} uchun matn kiriting (max 500 belgi)...`}
        rows={4}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={generate}
          disabled={loading || !text.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Ovoz yaratish
        </button>
        <span className="text-xs text-gray-400">{text.length}/500</span>
      </div>
      {audioUrl && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />
          <button onClick={togglePlay} className="p-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-700">Ovoz tayyor</p>
            <p className="text-xs text-gray-400">MP3 format</p>
          </div>
          <button onClick={download} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">
            <Download size={12} /> Yuklab olish
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Music Brief Panel ─── */
function MusicPanel() {
  const [mood, setMood] = useState("");
  const [genre, setGenre] = useState("electronic");
  const [tempo, setTempo] = useState("medium");
  const [duration, setDuration] = useState("60");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!mood.trim()) return;
    setLoading(true);
    setBrief("");
    try {
      const prompt = `Musiqa uchun professional brief yarat:
Kayfiyat: ${mood}
Janr: ${genre}
Tempo: ${tempo}
Davomiylik: ${duration} soniya

Quyidagi formatda qisqa inglizcha brief yoz (Suno AI uchun):
- Style tags: [janr, tempo, instrumental yoki vocal]
- Description: kayfiyat va foydalanish maqsadi
- Prompt: Suno'ga to'g'ridan-to'g'ri kiritish uchun tayyor prompt (max 200 so'z)`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      const text = await res.text();
      setBrief(text);
    } finally { setLoading(false); }
  }

  function copy() {
    navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Suno AI, Udio va boshqa musiqa generatorlari uchun professional brief yarating.</p>
      <div className="grid grid-cols-2 gap-3">
        <input value={mood} onChange={e => setMood(e.target.value)} placeholder="Kayfiyat (masalan: ilhomlantiruvchi, g'amgin, energetik)" className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 col-span-2" />
        <select value={genre} onChange={e => setGenre(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900">
          <option value="electronic">Electronic</option>
          <option value="cinematic">Cinematic</option>
          <option value="lofi">Lo-fi</option>
          <option value="ambient">Ambient</option>
          <option value="pop">Pop</option>
          <option value="hiphop">Hip-hop</option>
          <option value="rock">Rock</option>
          <option value="classical">Classical</option>
          <option value="folk">Folk / Acoustic</option>
        </select>
        <select value={tempo} onChange={e => setTempo(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900">
          <option value="slow">Sekin (60-80 BPM)</option>
          <option value="medium">O'rta (90-110 BPM)</option>
          <option value="fast">Tez (120-140 BPM)</option>
          <option value="very-fast">Juda tez (150+ BPM)</option>
        </select>
        <select value={duration} onChange={e => setDuration(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900">
          <option value="30">30 soniya</option>
          <option value="60">1 daqiqa</option>
          <option value="120">2 daqiqa</option>
          <option value="180">3 daqiqa</option>
        </select>
      </div>
      <button onClick={generate} disabled={loading || !mood.trim()} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
        Brief yaratish
      </button>
      {brief && (
        <div className="relative">
          <pre className="whitespace-pre-wrap text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 leading-relaxed">{brief}</pre>
          <button onClick={copy} className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-xs rounded-lg hover:bg-gray-100 transition-colors">
            {copied ? <><Check size={11} className="text-green-500" />Nusxalandi</> : <><Copy size={11} />Nusxalash</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Upscale Panel ─── */
function UpscalePanel() {
  const [url, setUrl] = useState("");
  const [scale, setScale] = useState("2");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function upscale() {
    if (!url.trim()) return;
    setLoading(true);
    // Try free upscaling via AI chat with instructions, or redirect to chat with context
    try {
      // Use Replicate or similar if key exists, otherwise chat fallback
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Rasm sifatini ${scale}x oshirish kerak. Rasm URL: ${url}

Quyidagilarni baj:
1. Real.ESRGAN yoki Waifu2x orqali upscaling qil (agar mumkin bo'lsa)
2. Agar API yo'q bo'lsa — mijozga bepul onlayn asboblar tavsiya qil: upscayl.com, bigjpg.com, imgupscaler.com
3. Rasmni qayta ishlash bo'yicha professional maslahat ber`
          }]
        }),
      });
      const text = await res.text();
      setResult(text);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Rasm URL'ini kiriting — AI sifatini oshiradi yoki eng yaxshi bepul asboblarni tavsiya qiladi.</p>
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/image.jpg" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900" />
      <select value={scale} onChange={e => setScale(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900">
        <option value="2">2x (HD)</option>
        <option value="4">4x (Full HD)</option>
        <option value="8">8x (4K)</option>
      </select>
      <button onClick={upscale} disabled={loading || !url.trim()} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Maximize2 size={14} />}
        Sifatni oshirish
      </button>
      {result && (
        <div className="prose prose-sm max-w-none bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">{result}</div>
      )}
    </div>
  );
}

/* ─── Chat panel (for tools that use /chat) ─── */
function ChatPanel({ tool }: { tool: Tool }) {
  const router = useRouter();
  const [text, setText] = useState("");

  const PROMPTS: Record<ToolId, string> = {
    image:    "AI rasm yaratish kerak. Tavsif:",
    video:    "Video tahrirlashga yordam kerak:",
    voice:    "",
    avatar:   "",
    music:    "",
    subtitle: "Video uchun subtitr kerak. Matn yoki audio link:",
    cut:      "Videoni qisqartirish va qismlarga bo'lish kerak:",
    upscale:  "",
    translate:"Audio/video tarjima kerak. Manba til → maqsad til va link:",
  };

  const placeholder = PROMPTS[tool.id] || `${tool.label} uchun vazifani tasvirlab bering...`;

  function send() {
    const q = text.trim() ? `${placeholder} ${text}` : placeholder;
    router.push(`/chat?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">{tool.desc} — AI yordamida bajaring.</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Qo'shimcha ma'lumot kiriting (ixtiyoriy)..."
        rows={3}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
      />
      <button onClick={send} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
        <Wand2 size={14} />
        AI bilan boshlash
      </button>
    </div>
  );
}

export default function MediaPage() {
  const [active, setActive] = useState<ToolId | null>(null);

  const activeTool = TOOLS.find(t => t.id === active);

  function renderPanel(tool: Tool) {
    if (tool.id === "voice" || tool.id === "avatar") {
      return <TTSPanel label={tool.label} hint={tool.id === "avatar" ? "Avatar video skriptini ovozga aylantiring — keyin video tool bilan birlashtiring." : "Matnni professional ovozga aylantiring (ElevenLabs yoki bepul TTS)."} />;
    }
    if (tool.id === "music") return <MusicPanel />;
    if (tool.id === "upscale") return <UpscalePanel />;
    return <ChatPanel tool={tool} />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Media Studio</h1>
        <p className="text-sm text-gray-500 mt-0.5">AI bilan kontent yarating — rasm, video, ovoz, avatar, musiqa</p>
      </div>

      {/* Quick prompts */}
      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <p className="text-sm font-semibold mb-3">Tez boshlash</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "Reklama video skripti", id: "video" as ToolId },
            { label: "Telegram kanal ovozi",  id: "voice" as ToolId },
            { label: "SMM uchun musiqa",      id: "music" as ToolId },
            { label: "Subtitr yaratish",      id: "subtitle" as ToolId },
            { label: "Rasm tarjimasi",        id: "translate" as ToolId },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => setActive(active === p.id ? null : p.id)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs rounded-lg transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active tool panel */}
      {activeTool && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <activeTool.icon size={16} className="text-gray-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{activeTool.label}</p>
                <p className="text-xs text-gray-400">{activeTool.desc}</p>
              </div>
            </div>
            <button onClick={() => setActive(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={14} />
            </button>
          </div>
          {renderPanel(activeTool)}
        </div>
      )}

      {/* Tools grid */}
      <div className="grid grid-cols-3 gap-3">
        {TOOLS.map(t => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(isActive ? null : t.id)}
              className={`bg-white border rounded-xl p-4 text-left transition-all hover:shadow-sm ${
                isActive ? "border-gray-900 shadow-sm" : "border-gray-100 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg transition-colors ${isActive ? "bg-gray-900" : "bg-gray-100"}`}>
                  <Icon size={18} className={isActive ? "text-white" : "text-gray-700"} />
                </div>
                {isActive && <ChevronRight size={14} className="text-gray-400 rotate-90" />}
              </div>
              <p className="text-sm font-semibold text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

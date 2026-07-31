"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mic, Send, History, Volume2, VolumeX, ChevronDown, Code2, Eye } from "lucide-react";
import { useVoiceInput, useVoiceOutput } from "@/hooks/useVoice";

type Message = { role: "user" | "assistant"; content: string; ts?: number };

// ─── Dust Particle Canvas ─────────────────────────────────────────────────────
function DustCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const pts: { x: number; y: number; vx: number; vy: number; r: number; a: number; da: number }[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Butterfly-shaped distribution
    const N = 120;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      // Butterfly curve parametric (r = e^sin(t) - 2cos(4t) + sin^5((2t-π)/24))
      const r = (Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.pow(Math.sin((2 * t - Math.PI) / 24), 5));
      const cx = (canvas.width ?? 600) / 2;
      const cy = (canvas.height ?? 400) / 2;
      const scale = Math.min(canvas.width, canvas.height) * 0.18;
      const px = cx + r * Math.cos(t) * scale;
      const py = cy - r * Math.sin(t) * scale * 0.7;
      pts.push({
        x: px + (Math.random() - 0.5) * 40,
        y: py + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.004,
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.da;
        if (p.a > 1 || p.a < 0.05) p.da *= -1;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      }

      // Connections (only close pairs)
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 70) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            const alpha = (1 - dist / 70) * 0.12;
            ctx.strokeStyle = `rgba(160, 130, 255, ${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      // Particles
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 150, 255, ${p.a * 0.55})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.85 }}
    />
  );
}

// ─── HTML Artifact preview ────────────────────────────────────────────────────
function ArtifactCard({ html }: { html: string }) {
  const [view, setView] = useState<"preview" | "code">("preview");

  return (
    <div className="mt-2 rounded-xl border border-purple-500/20 bg-black/30 overflow-hidden max-w-xs sm:max-w-md">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-purple-500/15">
        <span className="text-[10px] text-purple-300/60 uppercase tracking-wider">Artifact</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView("preview")}
            className={`p-1 rounded transition-colors ${view === "preview" ? "text-purple-300 bg-purple-500/15" : "text-purple-300/40 hover:text-purple-300/70"}`}
          >
            <Eye size={11} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setView("code")}
            className={`p-1 rounded transition-colors ${view === "code" ? "text-purple-300 bg-purple-500/15" : "text-purple-300/40 hover:text-purple-300/70"}`}
          >
            <Code2 size={11} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {view === "preview" ? (
        <iframe
          srcDoc={html}
          sandbox="allow-scripts"
          className="w-full bg-white"
          style={{ height: 280 }}
        />
      ) : (
        <pre className="text-purple-200 text-xs p-3 overflow-auto font-mono" style={{ maxHeight: 280 }}>
          {html}
        </pre>
      )}
    </div>
  );
}

function splitArtifacts(text: string): { type: "text" | "html"; content: string }[] {
  const parts: { type: "text" | "html"; content: string }[] = [];
  const re = /```html\n?([\s\S]*?)```/g;
  let last = 0;
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ type: "text", content: text.slice(last, match.index) });
    parts.push({ type: "html", content: match[1].trim() });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts;
}

// ─── Message bubble (hidden until clicked) ────────────────────────────────────
function MessageBubble({ m }: { m: Message }) {
  const [open, setOpen] = useState(false);
  const isUser = m.role === "user";

  function formatText(text: string) {
    return text
      .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) =>
        `<pre class="bg-black/40 text-purple-200 rounded-lg p-3 text-xs overflow-x-auto my-2 font-mono">${code.trim()}</pre>`)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\n/g, "<br />");
  }

  const segments = !isUser ? splitArtifacts(m.content) : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`group relative flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-2 transition-all duration-300 ${isUser ? "flex-row-reverse" : ""}`}
        >
          {/* Dot indicator */}
          <span
            className={`flex-shrink-0 rounded-full transition-all duration-300 ${
              open ? "w-2 h-2" : "w-2.5 h-2.5"
            } ${isUser ? "bg-orange-400/70" : "bg-purple-400/60"}`}
            style={{ boxShadow: open ? "0 0 6px 2px rgba(160,100,255,0.3)" : "none" }}
          />

          {/* Content — hidden until open */}
          <span
            className={`text-sm leading-relaxed transition-all duration-300 text-left max-w-xs sm:max-w-md rounded-2xl px-3 py-2 ${
              open
                ? isUser
                  ? "opacity-100 bg-orange-500/15 text-orange-100 border border-orange-500/20"
                  : "opacity-100 bg-purple-500/10 text-purple-100 border border-purple-500/15"
                : "opacity-0 w-0 px-0 py-0 overflow-hidden"
            }`}
          >
            {segments ? (
              segments.filter((s) => s.type === "text" && s.content.trim()).map((s, i) => (
                <span key={i} dangerouslySetInnerHTML={{ __html: formatText(s.content) }} />
              ))
            ) : (
              m.content
            )}
          </span>

          {open && (
            <ChevronDown size={10} className={`text-purple-400/50 flex-shrink-0 ${isUser ? "rotate-180" : ""}`} />
          )}
        </button>

        {open && segments && segments.filter((s) => s.type === "html").map((s, i) => (
          <ArtifactCard key={i} html={s.content} />
        ))}
      </div>
    </div>
  );
}

async function saveConversation(id: string | null, messages: Message[]): Promise<string | null> {
  try {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, messages }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id;
  } catch { return null; }
}

// Intent chip labels shown above input
const INTENT_LABELS: Record<string, string> = {
  task: "✅ Vazifa",
  code: "💻 Kod",
  search: "🔍 Qidiruv",
  analyze: "📊 Tahlil",
  write: "✍️ Yozish",
  devops: "⚙️ DevOps",
  plan: "🗺️ Reja",
  calendar: "📅 Taqvim",
  finance: "💰 Moliya",
  legal: "⚖️ Huquq",
  knowledge_save: "💾 Xotira",
  knowledge_search: "🧠 Qidirish",
  navigate: "🔗 Sahifa",
  hermes: "🪄 Agent",
  agent: "🤖 Agent",
};

function ChatInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const [intentHint, setIntentHint] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);
  const intentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect intent as user types (debounced, 600ms)
  const detectIntent = useCallback((text: string) => {
    if (intentTimer.current) clearTimeout(intentTimer.current);
    if (!text.trim() || text.length < 5) { setIntentHint(null); return; }
    intentTimer.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/fatosat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const d = await r.json();
        const t = d.intent?.type;
        if (t && t !== "chat") setIntentHint(INTENT_LABELS[t] || t);
        else setIntentHint(null);
      } catch { setIntentHint(null); }
    }, 600);
  }, []);

  const onVoiceResult = useCallback((text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  }, []);
  const voiceIn = useVoiceInput(onVoiceResult);
  const voiceOut = useVoiceOutput();

  useEffect(() => {
    const id = searchParams.get("id");
    const q = searchParams.get("q");
    if (id && !initialized.current) {
      initialized.current = true;
      setConvId(id);
      fetch(`/api/conversations?id=${id}`)
        .then(r => r.json())
        .then(data => { if (data.messages) setMessages(data.messages); })
        .catch(() => {});
    } else if (q && !initialized.current) {
      initialized.current = true;
      sendMessage(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function sendMessage(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setIntentHint(null);

    const newMessages: Message[] = [...messages, { role: "user", content: msg, ts: Date.now() }];
    setMessages(newMessages);
    setLoading(true);
    setStreaming("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(({ role, content }) => ({ role, content })) }),
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setStreaming(full);
      }
      const finalMessages: Message[] = [...newMessages, { role: "assistant", content: full, ts: Date.now() }];
      setMessages(finalMessages);
      setStreaming("");
      voiceOut.speak(full);
      const savedId = await saveConversation(convId, finalMessages);
      if (savedId && !convId) {
        setConvId(savedId);
        router.replace(`/chat?id=${savedId}`, { scroll: false });
      }
    } catch (err) {
      const msg = err instanceof Error && err.message && err.message !== "Failed to fetch"
        ? `Xato: ${err.message}. Qayta urinib ko'ring.`
        : "Xato yuz berdi. Qayta urinib ko'ring.";
      setMessages(prev => [...prev, { role: "assistant", content: msg, ts: Date.now() }]);
      setStreaming("");
    }
    setLoading(false);
  }

  function newChat() {
    setMessages([]);
    setConvId(null);
    initialized.current = false;
    router.replace("/chat", { scroll: false });
  }

  return (
    <div
      className="flex flex-col relative"
      style={{
        height: "calc(100vh - 8rem)",
        background: "linear-gradient(160deg, #0d0b1a 0%, #100e22 60%, #0f0c1e 100%)",
        borderRadius: "1.25rem",
        overflow: "hidden",
      }}
    >
      {/* Particle background */}
      <DustCanvas />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-purple-400/70 animate-pulse" />
          <span className="text-sm font-medium text-purple-200/80 tracking-wide">Pari</span>
        </div>
        <div className="flex items-center gap-2">
          {voiceOut.supported && (
            <button
              onClick={() => { if (voiceOut.enabled) voiceOut.stop(); voiceOut.setEnabled(); }}
              className={`p-1.5 rounded-lg transition-all ${voiceOut.enabled ? "text-purple-300" : "text-white/20 hover:text-white/40"}`}
            >
              {voiceOut.enabled ? <Volume2 size={13} strokeWidth={1.75} /> : <VolumeX size={13} strokeWidth={1.75} />}
            </button>
          )}
          <button
            onClick={newChat}
            className="flex items-center gap-1 text-xs text-white/25 hover:text-white/50 transition-colors px-2 py-1"
          >
            <History size={12} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {messages.length === 0 && !streaming && !loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white/15 text-xs tracking-widest uppercase select-none">
              xabar yozing
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} m={m} />
        ))}

        {streaming && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400/60 animate-pulse" />
              <span className="text-xs text-purple-200/50 italic">{streaming.slice(0, 60)}{streaming.length > 60 ? "…" : ""}</span>
            </div>
          </div>
        )}

        {loading && !streaming && (
          <div className="flex items-center gap-1.5 pl-4">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-purple-400/40"
                style={{ animation: `pulse 1.2s ease infinite ${i * 0.25}s` }}
              />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Intent hint chip */}
      {intentHint && (
        <div className="relative z-10 px-5 pb-1">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{ background: "rgba(160,100,255,0.15)", color: "rgba(200,170,255,0.8)", border: "1px solid rgba(160,100,255,0.2)" }}
          >
            {intentHint}
          </span>
        </div>
      )}

      {/* Input */}
      <div className="relative z-10 px-4 pb-4">
        <div
          className="flex items-end gap-2 px-4 py-3 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(160,130,255,0.12)",
            backdropFilter: "blur(12px)",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); detectIntent(e.target.value); }}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="…"
            rows={1}
            className="flex-1 resize-none text-sm bg-transparent focus:outline-none text-white/80 placeholder-white/15 max-h-28 leading-relaxed py-0.5"
            style={{ minHeight: "20px" }}
          />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {voiceIn.supported && (
              <button
                onClick={voiceIn.toggle}
                className={`p-1.5 rounded-lg transition-all ${
                  voiceIn.listening ? "text-red-400 animate-pulse" : "text-white/25 hover:text-white/50"
                }`}
              >
                <Mic size={14} strokeWidth={1.75} />
              </button>
            )}
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-20"
              style={{
                background: input.trim() && !loading ? "rgba(160,100,255,0.5)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(160,100,255,0.2)",
              }}
            >
              <Send size={13} strokeWidth={2} className="text-white/80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><span className="text-white/20 text-sm">…</span></div>}>
      <ChatInner />
    </Suspense>
  );
}

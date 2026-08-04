"use client";
import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mic, Send, History, Volume2, VolumeX } from "lucide-react";
import { useVoiceInput, useVoiceOutput } from "@/hooks/useVoice";
import ChatSkillsBar from "@/components/ChatSkillsBar";

type Message = { role: "user" | "assistant"; content: string; ts?: number };

function DustCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const pts: { x: number; y: number; vx: number; vy: number; r: number; a: number; da: number }[] = [];
    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 80; i++) {
      pts.push({
        x: Math.random() * (canvas.width || 300),
        y: Math.random() * (canvas.height || 400),
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.004,
      });
    }
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.da;
        if (p.a > 1 || p.a < 0.05) p.da *= -1;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.fillStyle = `rgba(180,140,255,${0.15 + p.a * 0.25})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

async function saveConversation(id: string | null, messages: Message[]) {
  try {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, messages }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id as string | null;
  } catch {
    return null;
  }
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`text-sm leading-relaxed max-w-xs sm:max-w-md rounded-2xl px-3.5 py-2.5 ${
          isUser ? "bg-violet-600/40 text-white/90" : "bg-white/5 text-white/75"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

function ChatInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

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
        .then((r) => r.json())
        .then((data) => {
          if (data.messages) setMessages(data.messages);
        })
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

  async function runSkill(skillId: string, text: string) {
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, skill: skillId || undefined, remember: true }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `skill ${res.status}`);
    return String(data.answer || "");
  }

  async function sendMessage(text?: string, skillId?: string) {
    const msg = (text || input).trim();
    if ((!msg && !skillId) || loading) return;
    setInput("");

    const display = msg || skillId || "";
    const newMessages: Message[] = [...messages, { role: "user", content: display, ts: Date.now() }];
    setMessages(newMessages);
    setLoading(true);
    setStreaming("");

    try {
      let full = "";
      const skillTriggers =
        /\b(plan|reja|metrics|holat|brifing|brief|inbox|reflect|yakun|trend|esla|xotira)\b/i;

      if (skillId || skillTriggers.test(display)) {
        full = await runSkill(skillId || "", display);
        setStreaming(full);
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map(({ role, content }) => ({ role, content })),
          }),
          signal: AbortSignal.timeout(25000),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `HTTP ${res.status}`);
        }
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value);
          setStreaming(full);
        }
      }

      const finalMessages: Message[] = [
        ...newMessages,
        { role: "assistant", content: full, ts: Date.now() },
      ];
      setMessages(finalMessages);
      setStreaming("");
      voiceOut.speak(full);
      const savedId = await saveConversation(convId, finalMessages);
      if (savedId && !convId) {
        setConvId(savedId);
        router.replace(`/chat?id=${savedId}`, { scroll: false });
      }
    } catch (err) {
      const errMsg =
        err instanceof Error && err.message && err.message !== "Failed to fetch"
          ? `Xato: ${err.message}. Qayta urinib ko'ring.`
          : "Xato yuz berdi. Qayta urinib ko'ring.";
      setMessages((prev) => [...prev, { role: "assistant", content: errMsg, ts: Date.now() }]);
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
      className="flex flex-col relative pb-16 lg:pb-0"
      style={{ height: "100dvh", background: "#050510" }}
    >
      <DustCanvas />

      <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-purple-400/70 animate-pulse" />
          <span className="text-sm font-medium text-purple-200/80 tracking-wide">Pari</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => voiceOut.setEnabled()}
            className={`p-1.5 rounded-lg transition-all ${
              voiceOut.enabled ? "text-purple-300" : "text-white/20 hover:text-white/50"
            }`}
            aria-label="Ovoz"
          >
            {voiceOut.enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button
            type="button"
            onClick={newChat}
            className="flex items-center gap-1 text-xs text-white/25 hover:text-white/50 transition-colors px-2 py-1"
          >
            <History size={12} /> Yangi
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 space-y-3">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full opacity-50 pt-20">
            <p className="text-sm text-white/40">Yozing yoki chip tanlang</p>
            <p className="text-xs text-white/25 mt-1">reja · brifing · holat · trend</p>
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {streaming && <Bubble role="assistant" content={streaming} />}
        {loading && !streaming && (
          <div className="flex items-center gap-1.5 pl-2">
            {[0, 1, 2].map((i) => (
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

      <div className="relative z-10 px-4 pb-4 space-y-2">
        <ChatSkillsBar disabled={loading} onPick={(id, label) => sendMessage(label, id)} />
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())
            }
            placeholder="…"
            rows={1}
            className="flex-1 resize-none text-sm bg-transparent focus:outline-none text-white/80 placeholder-white/15 max-h-28 leading-relaxed py-0.5"
            style={{ minHeight: "20px" }}
          />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {voiceIn.supported && (
              <button
                type="button"
                onClick={voiceIn.toggle}
                className={`p-1.5 rounded-lg transition-all ${
                  voiceIn.listening ? "text-red-400 animate-pulse" : "text-white/25 hover:text-white/50"
                }`}
              >
                <Mic size={14} strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-20"
              style={{
                background:
                  input.trim() && !loading ? "rgba(160,100,255,0.5)" : "rgba(255,255,255,0.05)",
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <span className="text-white/20 text-sm">…</span>
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  );
}

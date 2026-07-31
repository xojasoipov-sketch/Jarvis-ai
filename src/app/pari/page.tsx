"use client";
import { useCallback, useState } from "react";
import { Send } from "lucide-react";
import { useJarvisVoice } from "@/hooks/useJarvisVoice";

const STATE_LABEL: Record<string, string> = {
  asleep:    "Bosing va gapiring",
  waking:    "Eshityapman...",
  listening: "Tinglayapman...",
  thinking:  "O'ylayapman...",
  speaking:  "Javob beryapman...",
};

async function askPariText(text: string): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
  });
  if (!res.ok) return "Kechirasiz, xato yuz berdi.";
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
  }
  return full.trim() || "Javob bo'sh qaytdi.";
}

export default function PariPage() {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");

  const jarvis = useJarvisVoice();

  const sendTyped = useCallback(async () => {
    const msg = typed.trim();
    if (!msg || busy) return;
    setTyped("");
    setBusy(true);
    setTextAnswer("");
    const answer = await askPariText(msg);
    setTextAnswer(answer);
    setBusy(false);
  }, [typed, busy]);

  const isActive = jarvis.active;
  const isBusy = jarvis.state === "thinking" || jarvis.state === "speaking";

  return (
    <div className="fade-in flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Pari</h1>
          <p className="text-sm text-white/40 mt-1">Sadining ovozli yordamchisi</p>
        </div>

        {/* Tap button */}
        <button
          onClick={jarvis.toggle}
          disabled={!jarvis.supported || isBusy}
          className={`relative w-32 h-32 rounded-full transition-all duration-300 disabled:opacity-40 disabled:cursor-default focus:outline-none ${
            isActive
              ? "bg-[#ff6a1a]/15 border-2 border-[#ff6a1a]/60 shadow-[0_0_32px_rgba(255,106,26,0.2)]"
              : "bg-white/5 border-2 border-white/10 hover:border-white/25 hover:bg-white/8"
          }`}
          aria-label={isActive ? "To'xtatish" : "Bosing va gapiring"}
        >
          {/* Pulse ring when listening */}
          {jarvis.state === "listening" && (
            <span className="absolute inset-0 rounded-full border-2 border-[#ff6a1a]/40 animate-ping" />
          )}

          {/* Mic icon */}
          <span className="flex flex-col items-center justify-center gap-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              className={isActive ? "text-[#ff6a1a]" : "text-white/50"}>
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </span>
        </button>

        {/* State label */}
        <p className={`text-sm transition-colors ${isActive ? "text-[#ff6a1a]/80" : "text-white/35"}`}>
          {STATE_LABEL[jarvis.state]}
        </p>

        {/* Error */}
        {jarvis.error && (
          <p className="text-xs text-red-400/80 text-center">{jarvis.error}</p>
        )}

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-xs text-white/20">yoki yozing</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* Text input */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTyped()}
              placeholder="Savol yozing..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/25 transition-colors"
            />
            <button
              onClick={sendTyped}
              disabled={!typed.trim() || busy}
              className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#ff6a1a] hover:bg-[#ff7a30] disabled:opacity-30 disabled:cursor-default text-white flex items-center justify-center transition-colors"
            >
              <Send size={14} strokeWidth={2} />
            </button>
          </div>

          {textAnswer && (
            <p className="text-sm text-white/70 leading-relaxed px-1">
              {textAnswer}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

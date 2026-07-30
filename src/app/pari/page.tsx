"use client";
import { useCallback, useEffect, useState } from "react";
import { Mic, Radio, Send } from "lucide-react";
import NeuralButterfly from "@/components/NeuralButterfly";
import { useJarvisVoice } from "@/hooks/useJarvisVoice";
import type { MemoryNode } from "@/app/api/pari/nodes/route";

const TYPE_LABEL: Record<MemoryNode["type"], string> = {
  vault: "vault fayli",
  task: "vazifa",
  project: "loyiha",
  agent: "agent xotirasi",
  tool: "vosita",
};

const STATE_LABEL: Record<string, string> = {
  asleep: "Meni chaqiring — “Pari” deng, yoki pastdan gapiring",
  waking: "Eshityapman...",
  listening: "Tinglayapman...",
  thinking: "O'ylayapman...",
  speaking: "Javob beryapman...",
};

async function askPari(text: string): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
  });
  if (!res.ok) return "Kechirasiz, javob olishda xato yuz berdi.";
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value);
  }
  return full.trim() || "Javob bo'sh qaytdi.";
}

export default function PariPage() {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualAnswer, setManualAnswer] = useState("");
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/api/pari/nodes")
      .then((r) => r.json())
      .then((d) => { setNodes(d.nodes || []); setCounts(d.counts || {}); })
      .catch(() => {});
  }, []);

  const onCommand = useCallback(async (text: string) => askPari(text), []);
  const jarvis = useJarvisVoice(onCommand);

  async function sendTyped() {
    const msg = typed.trim();
    if (!msg || busy) return;
    setTyped("");
    setBusy(true);
    setManualAnswer("");
    const answer = await askPari(msg);
    setManualAnswer(answer);
    setBusy(false);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Xayrli tong" : hour < 17 ? "Xayrli kun" : "Xayrli kech";

  return (
    <div className="fade-in max-w-4xl mx-auto">
      <div
        className="relative overflow-hidden rounded-3xl border border-[#26224a] shadow-sm"
        style={{ background: "radial-gradient(120% 100% at 50% 0%, #1b1738 0%, #0c0b16 60%)" }}
      >
        <div className="relative z-10 px-6 pt-10 pb-8 sm:px-10 text-center">
          <p className="text-sm text-[#a99bf5]">{greeting}, Sadi</p>
          <h1 className="text-2xl font-bold text-white mt-1">Pari bilan gaplashing</h1>

          <div className="my-2 mx-auto" style={{ width: "min(100%, 420px)", height: "min(100vw, 420px)" }}>
            <button
              onClick={jarvis.state === "asleep" ? jarvis.wake : jarvis.stopListening}
              disabled={!jarvis.supported || jarvis.state === "thinking" || jarvis.state === "speaking"}
              className="w-full h-full cursor-pointer disabled:cursor-default"
              aria-label={jarvis.state === "asleep" ? "Bosing va gapiring" : "To'xtatish"}
            >
              <NeuralButterfly state={jarvis.state} nodes={nodes} />
            </button>
          </div>

          <p className="text-sm text-[#c7bdf7] min-h-[20px]">{STATE_LABEL[jarvis.state]}</p>

          {nodes.length > 0 && (
            <p className="text-xs text-white/40 mt-1">
              {nodes.length} ta xotira nuqtasi — {Object.entries(counts).map(([type, n]) => `${n} ${TYPE_LABEL[type as MemoryNode["type"]]}`).join(", ")}
            </p>
          )}

          {jarvis.transcript && (
            <p className="mt-3 text-sm text-white/70 italic">&quot;{jarvis.transcript}&quot;</p>
          )}
          {jarvis.reply && (
            <p className="mt-2 text-sm text-white max-w-lg mx-auto leading-relaxed">{jarvis.reply}</p>
          )}

          {jarvis.supported && (
            <button
              onClick={jarvis.toggleAlwaysOn}
              className={`mt-6 inline-flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border transition-all ${
                jarvis.alwaysOn
                  ? "bg-[#8b7bf0]/20 border-[#8b7bf0] text-[#c7bdf7]"
                  : "bg-white/5 border-white/15 text-white/60 hover:text-white/80"
              }`}
            >
              <Radio size={13} strokeWidth={2} className={jarvis.alwaysOn ? "animate-pulse" : ""} />
              {jarvis.alwaysOn ? "Doim tinglayapman (“Pari” deng)" : "Doim tinglashni yoqish"}
            </button>
          )}

          {!jarvis.supported && (
            <p className="mt-4 text-xs text-white/40">Mikrofon ruxsati berilmagan — pastdan yozing.</p>
          )}
        </div>

        {/* Typed fallback — same brain, no mic needed */}
        <div className="relative z-10 border-t border-white/10 bg-black/20 px-5 py-4">
          <div className="flex items-center gap-2 max-w-xl mx-auto">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTyped()}
              placeholder="Yoki shu yerga yozing..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#8b7bf0]/60"
            />
            <button
              onClick={sendTyped}
              disabled={!typed.trim() || busy}
              className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#6f5be0] hover:bg-[#7d69ee] disabled:opacity-30 text-white flex items-center justify-center transition-all"
            >
              {busy ? <Mic size={14} className="animate-pulse" /> : <Send size={14} strokeWidth={2} />}
            </button>
          </div>
          {manualAnswer && (
            <p className="max-w-xl mx-auto mt-3 text-sm text-white/85 leading-relaxed">{manualAnswer}</p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Sparkles, Paperclip, Mic, Send } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "Biznesimni rivojlantirish uchun strategiya ber",
  "Python da web scraper yoz",
  "Marketing kampaniyasi rejasini tuz",
  "Raqobatchilarni tahlil qil",
  "Loyiha boshqaruv tizimini ishlab chiq",
];

function formatText(text: string) {
  return text
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto my-2 font-mono">${code.trim()}</pre>`)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-[#f5f1ea] mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-[#f5f1ea] mt-4 mb-2">$1</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-[#cfc9bd]">$1</li>')
    .replace(/\n/g, "<br />");
}

function ChatInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !initialized.current) {
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

    const newMessages: Message[] = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setLoading(true);
    setStreaming("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error("API xatosi");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        full += chunk;
        setStreaming(full);
      }

      setMessages([...newMessages, { role: "assistant", content: full }]);
      setStreaming("");
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Kechirasiz, xato yuz berdi. Qayta urinib ko'ring." }]);
      setStreaming("");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6a1a] to-[#7a1f1f] flex items-center justify-center text-white">
          <Bot size={20} strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#f5f1ea]">Pari AI</h1>
          <div className="flex items-center gap-1.5">
            <span className="pulse-dot w-2 h-2" />
            <span className="text-xs text-green-600">Online — Gemini 2.0 Flash</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && !streaming && (
          <div className="fade-in text-center py-12">
            <Sparkles size={48} strokeWidth={1.25} className="mx-auto mb-4 text-[#ff8a3d]" />
            <h2 className="text-xl font-bold text-[#f5f1ea] mb-2">Pari AI ga xush kelibsiz!</h2>
            <p className="text-[#7d7870] text-sm mb-8 max-w-md mx-auto">
              Men sizning shaxsiy AI yordamchingizman. Biznes, kod, tadqiqot, avtomatlashtirish — hamma narsada yordam beraman.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-sm px-4 py-2 bg-[#141316] border border-white/[0.12] hover:border-[#ff6a1a]/40 hover:text-[#ff8a3d] text-[#a39d92] rounded-xl transition-all shadow-sm">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`fade-in flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
              m.role === "user" ? "bg-[#ff6a1a] text-white" : "bg-gradient-to-br from-[#ff6a1a]/20 to-[#ff6a1a]/10 text-[#ff8a3d]"
            }`}>
              {m.role === "user" ? "S" : "P"}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-[#ff6a1a] text-white rounded-tr-sm"
                : "bg-[#141316] border border-white/[0.08] shadow-sm text-[#cfc9bd] rounded-tl-sm"
            }`}>
              {m.role === "assistant" ? (
                <div dangerouslySetInnerHTML={{ __html: formatText(m.content) }} />
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}

        {streaming && (
          <div className="fade-in flex gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-[#ff6a1a]/20 to-[#ff6a1a]/10 flex items-center justify-center text-sm font-bold text-[#ff8a3d]">P</div>
            <div className="max-w-[80%] bg-[#141316] border border-white/[0.08] shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#cfc9bd] leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: formatText(streaming) }} />
              <span className="inline-block w-1.5 h-4 bg-[#ff6a1a] ml-0.5 animate-pulse rounded" />
            </div>
          </div>
        )}

        {loading && !streaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff6a1a]/20 to-[#ff6a1a]/10 flex items-center justify-center text-sm font-bold text-[#ff8a3d]">P</div>
            <div className="bg-[#141316] border border-white/[0.08] shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-5">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full bg-[#ff6a1a]" style={{ animation: `pulse-dot 1.2s ease infinite ${i*0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-[#141316] border border-white/[0.12] rounded-2xl shadow-sm p-3">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Xabar yozing... (Enter — yuborish, Shift+Enter — yangi qator)"
            rows={1}
            className="flex-1 resize-none text-sm bg-transparent focus:outline-none placeholder-gray-400 max-h-32 leading-relaxed py-1"
            style={{ minHeight: "24px" }}
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="p-1.5 text-[#5c584f] hover:text-[#a39d92] transition-colors"><Paperclip size={15} strokeWidth={1.75} /></button>
            <button className="p-1.5 text-[#5c584f] hover:text-[#a39d92] transition-colors"><Mic size={15} strokeWidth={1.75} /></button>
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="w-9 h-9 bg-[#ff6a1a] hover:bg-[#e85a0f] disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center">
              <Send size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
        <p className="text-xs text-[#5c584f] mt-2">Pari AI xato qilishi mumkin. Muhim ma'lumotlarni tekshiring.</p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><span className="text-[#5c584f]">Yuklanmoqda...</span></div>}>
      <ChatInner />
    </Suspense>
  );
}

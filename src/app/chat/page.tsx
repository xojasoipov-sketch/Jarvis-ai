"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Bot, Sparkles, Paperclip, Mic, Send, History } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; ts?: number };

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
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-gray-900 mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-4 mb-2">$1</h2>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700">$1</li>')
    .replace(/\n/g, "<br />");
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

  // Load conversation from URL param
  useEffect(() => {
    const id = searchParams.get("id");
    const q = searchParams.get("q");

    if (id && !initialized.current) {
      initialized.current = true;
      setConvId(id);
      fetch(`/api/conversations?id=${id}`)
        .then(r => r.json())
        .then(data => {
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

  async function sendMessage(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: msg, ts: Date.now() }];
    setMessages(newMessages);
    setLoading(true);
    setStreaming("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(({ role, content }) => ({ role, content })) }),
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

      const finalMessages: Message[] = [...newMessages, { role: "assistant", content: full, ts: Date.now() }];
      setMessages(finalMessages);
      setStreaming("");

      // Auto-save conversation
      const savedId = await saveConversation(convId, finalMessages);
      if (savedId && !convId) {
        setConvId(savedId);
        router.replace(`/chat?id=${savedId}`, { scroll: false });
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Kechirasiz, xato yuz berdi. Qayta urinib ko'ring.", ts: Date.now() }]);
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
    <div className="flex flex-col h-full max-w-4xl mx-auto" style={{ height: "calc(100vh - 8rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
          <Bot size={20} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Pari AI</h1>
          <div className="flex items-center gap-1.5">
            <span className="pulse-dot w-2 h-2" />
            <span className="text-xs text-green-600">Online — Gemini 2.0 Flash</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {convId && (
            <span className="text-xs text-gray-400 font-mono hidden sm:block truncate max-w-[120px]">{convId}</span>
          )}
          <button onClick={newChat} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 px-3 py-1.5 rounded-xl transition-all">
            <History size={13} strokeWidth={1.75} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && !streaming && (
          <div className="fade-in text-center py-12">
            <Sparkles size={48} strokeWidth={1.25} className="mx-auto mb-4 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pari AI ga xush kelibsiz!</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
              Men sizning shaxsiy AI yordamchingizman. Biznes, kod, tadqiqot, avtomatlashtirish — hamma narsada yordam beraman.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-sm px-4 py-2 bg-white border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-xl transition-all shadow-sm">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`fade-in flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
              m.role === "user" ? "bg-indigo-600 text-white" : "bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600"
            }`}>
              {m.role === "user" ? "S" : "P"}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-indigo-600 text-white rounded-tr-sm"
                : "bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-sm"
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
            <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm font-bold text-indigo-600">P</div>
            <div className="max-w-[80%] bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 leading-relaxed">
              <div dangerouslySetInnerHTML={{ __html: formatText(streaming) }} />
              <span className="inline-block w-1.5 h-4 bg-indigo-600 ml-0.5 animate-pulse rounded" />
            </div>
          </div>
        )}

        {loading && !streaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-sm font-bold text-indigo-600">P</div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-5">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 rounded-full bg-indigo-600" style={{ animation: `pulse-dot 1.2s ease infinite ${i*0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3">
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
            <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"><Paperclip size={15} strokeWidth={1.75} /></button>
            <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"><Mic size={15} strokeWidth={1.75} /></button>
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center">
              <Send size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Pari AI xato qilishi mumkin. Muhim ma'lumotlarni tekshiring.</p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><span className="text-gray-400">Yuklanmoqda...</span></div>}>
      <ChatInner />
    </Suspense>
  );
}

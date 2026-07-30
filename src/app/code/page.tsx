"use client";
import { useState } from "react";
import { Sparkles, Loader2, Lightbulb, Search, Copy } from "lucide-react";

const TEMPLATES = [
  { name: "Python script", lang: "python", code: `# Python skript\nimport os\n\ndef main():\n    print("Salom, Pari AI!")\n\nif __name__ == "__main__":\n    main()\n` },
  { name: "Next.js API", lang: "typescript", code: `import { NextRequest, NextResponse } from "next/server";\n\nexport async function POST(req: NextRequest) {\n  const { message } = await req.json();\n  return NextResponse.json({ reply: message });\n}\n` },
  { name: "SQL query", lang: "sql", code: `-- Ma'lumotlar bazasi so'rovi\nSELECT \n  u.id,\n  u.name,\n  COUNT(p.id) as project_count\nFROM users u\nLEFT JOIN projects p ON u.id = p.user_id\nGROUP BY u.id\nORDER BY project_count DESC;\n` },
  { name: "Bash script", lang: "bash", code: `#!/bin/bash\n# Deploy skripti\necho "Deploy boshlandi..."\ngit pull origin main\nnpm install\nnpm run build\necho "Deploy tugadi!"\n` },
];

const LANG_COLORS: Record<string, string> = {
  python: "text-yellow-400", typescript: "text-blue-400",
  javascript: "text-yellow-300", sql: "text-green-400",
  bash: "text-gray-300", json: "text-orange-400",
};

export default function CodeEditorPage() {
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [lang, setLang] = useState("python");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [tab, setTab] = useState<"editor" | "output">("editor");

  async function generateCode() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "coder",
          task: `${lang} tilida yoz: ${aiPrompt}\n\nFaqat kod yoz, izoh minimal bo'lsin.`,
        }),
      });
      const data = await res.json();
      const codeMatch = data.result?.match(/```[\w]*\n?([\s\S]*?)```/);
      setCode(codeMatch ? codeMatch[1].trim() : data.result);
      setTab("editor");
    } catch { /* ignore */ }
    setAiLoading(false);
  }

  async function explainCode() {
    if (!code.trim()) return;
    setAiLoading(true);
    setTab("output");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "coder", task: `Bu kodni tushuntir:\n\`\`\`${lang}\n${code}\n\`\`\`` }),
      });
      const data = await res.json();
      setOutput(data.result);
    } catch { setOutput("Xato yuz berdi."); }
    setAiLoading(false);
  }

  async function reviewCode() {
    if (!code.trim()) return;
    setAiLoading(true);
    setTab("output");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "coder", task: `Kodni ko'rib chiq, xatolarni va yaxshilashlarni ayt:\n\`\`\`${lang}\n${code}\n\`\`\`` }),
      });
      const data = await res.json();
      setOutput(data.result);
    } catch { setOutput("Xato yuz berdi."); }
    setAiLoading(false);
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
  }

  return (
    <div className="fade-in max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Code Editor</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI yordamida kod yozish, tushuntirish va tekshirish</p>
        </div>
      </div>

      {/* AI prompt */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-2">
          <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && generateCode()}
            placeholder="AI dan kod yozdiring... (masalan: 'FastAPI bilan REST API yoz')"
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <select value={lang} onChange={e => setLang(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none">
            {["python","typescript","javascript","sql","bash","json"].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={generateCode} disabled={aiLoading || !aiPrompt.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
            {aiLoading ? <Loader2 size={14} strokeWidth={2} className="animate-spin" /> : <Sparkles size={14} strokeWidth={1.75} />} Yoz
          </button>
        </div>

        {/* Templates */}
        <div className="flex gap-2 mt-3">
          <span className="text-xs text-gray-400 self-center">Shablon:</span>
          {TEMPLATES.map(t => (
            <button key={t.name} onClick={() => { setCode(t.code); setLang(t.lang); }}
              className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-all">
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className={`text-xs font-mono font-semibold ${LANG_COLORS[lang] || "text-gray-400"}`}>{lang}</span>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-gray-800 rounded-lg p-0.5">
              <button onClick={() => setTab("editor")} className={`px-3 py-1 text-xs rounded-md transition-all ${tab === "editor" ? "bg-gray-700 text-white" : "text-gray-400"}`}>Editor</button>
              <button onClick={() => setTab("output")} className={`px-3 py-1 text-xs rounded-md transition-all ${tab === "output" ? "bg-gray-700 text-white" : "text-gray-400"}`}>Output</button>
            </div>
            <button onClick={explainCode} disabled={aiLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-all"><Lightbulb size={13} strokeWidth={1.75} /> Tushuntir</button>
            <button onClick={reviewCode} disabled={aiLoading} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-all"><Search size={13} strokeWidth={1.75} /> Review</button>
            <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-all"><Copy size={13} strokeWidth={1.75} /> Nusxa</button>
          </div>
        </div>

        {/* Code area */}
        {tab === "editor" ? (
          <div className="flex">
            {/* Line numbers */}
            <div className="px-4 py-4 text-gray-600 text-xs font-mono select-none border-r border-gray-800 min-w-12 text-right">
              {code.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 px-4 py-4 bg-transparent text-green-400 text-sm font-mono resize-none focus:outline-none min-h-80"
              style={{ lineHeight: "1.6" }}
            />
          </div>
        ) : (
          <div className="p-5 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap min-h-80 font-mono">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <span className="w-4 h-4 border-2 border-gray-500 border-t-green-400 rounded-full animate-spin" />
                AI ishlayapti...
              </div>
            ) : output || "Tushuntirish yoki review uchun yuqoridagi tugmalardan foydalaning."}
          </div>
        )}
      </div>
    </div>
  );
}

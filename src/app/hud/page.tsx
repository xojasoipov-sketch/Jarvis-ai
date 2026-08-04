"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type SkillInfo = { name: string; description: string; triggers: string[] };

const COMMANDS = [
  { id: "metrics", label: "METRICS PULL" },
  { id: "inbox", label: "INBOX BRIEF" },
  { id: "plan", label: "PLAN TODAY" },
  { id: "trends", label: "TREND SCAN" },
  { id: "reflect", label: "CLOSE DAY" },
  { id: "vault", label: "VAULT QUERY" },
];

export default function HudPage() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [input, setInput] = useState("");
  const [log, setLog] = useState<{ t: string; role: "sys" | "you" | "pari"; text: string }[]>([
    { t: now(), role: "sys", text: "PARI HUD online · Speak → Route → Remember → Repeat" },
  ]);
  const [busy, setBusy] = useState(false);
  const [lastSkill, setLastSkill] = useState<string>("—");

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((d) => setSkills(d.skills || []))
      .catch(() => {});
  }, []);

  const run = useCallback(async (text: string, skill?: string) => {
    const q = text.trim();
    if (!q && !skill) return;
    setBusy(true);
    setLog((L) => [...L, { t: now(), role: "you", text: q || `/${skill}` }]);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q || skill, skill, remember: true }),
      });
      const data = await res.json();
      if (data.skill) setLastSkill(data.skill);
      const line = data.answer || data.error || "no answer";
      setLog((L) => [
        ...L,
        {
          t: now(),
          role: "pari",
          text: data.saved ? `${line}\n\n→ saved ${data.saved}` : line,
        },
      ]);
    } catch (e) {
      setLog((L) => [
        ...L,
        { t: now(), role: "sys", text: e instanceof Error ? e.message : "network error" },
      ]);
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#07070a] text-zinc-200 font-mono text-sm">
      {/* top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <div className="flex items-center gap-3">
          <span className="text-[11px] tracking-[0.2em] text-zinc-500">P A R I · H U D</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-zinc-500">LIVE</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          <span>SKILL {lastSkill}</span>
          <Link href="/pari" className="hover:text-zinc-300">
            GRAPH
          </Link>
          <Link href="/chat" className="hover:text-zinc-300">
            CHAT
          </Link>
        </div>
      </header>

      <div className="grid lg:grid-cols-[220px_1fr_240px] min-h-[calc(100dvh-41px)]">
        {/* vitals */}
        <aside className="border-r border-zinc-800 p-3 space-y-4 hidden lg:block">
          <Section title="VITALS">
            <Row k="Loop" v="SPEAK·ROUTE·REM" />
            <Row k="Skills" v={String(skills.length || 6)} />
            <Row k="Last" v={lastSkill} />
            <Row k="Owner" v="Sadi" />
          </Section>
          <Section title="DAY">
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              07:00 Brief · 09:00 Plan · 14:00 Metrics · 19:00 Reflect · Anytime ask
            </p>
          </Section>
        </aside>

        {/* main deck */}
        <main className="flex flex-col min-h-[60vh]">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {log.map((m, i) => (
              <div key={i} className="space-y-0.5">
                <div className="text-[10px] text-zinc-600">
                  {m.t} · {m.role.toUpperCase()}
                </div>
                <pre
                  className={`whitespace-pre-wrap text-[12px] leading-relaxed ${
                    m.role === "you"
                      ? "text-sky-300"
                      : m.role === "sys"
                        ? "text-zinc-500"
                        : "text-zinc-200"
                  }`}
                >
                  {m.text}
                </pre>
              </div>
            ))}
            {busy && <div className="text-[11px] text-amber-500/80 animate-pulse">routing…</div>}
          </div>

          <form
            className="border-t border-zinc-800 p-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = input;
              setInput("");
              run(v);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="buyruq yoki savol — plan / metrics / esla …"
              className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded px-3 py-2.5 text-[13px] outline-none focus:border-zinc-600"
            />
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded bg-zinc-100 text-zinc-900 text-[12px] font-semibold disabled:opacity-40"
            >
              RUN
            </button>
          </form>
        </main>

        {/* command deck */}
        <aside className="border-l border-zinc-800 p-3 space-y-2">
          <div className="text-[10px] tracking-[0.15em] text-zinc-500 mb-2">COMMAND DECK</div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            {COMMANDS.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={busy}
                onClick={() => run(c.label.toLowerCase(), c.id)}
                className="text-left px-2.5 py-2 rounded border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/60 text-[11px] tracking-wide disabled:opacity-40"
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 pt-3 leading-relaxed">
            Small single-purpose skills beat one giant prompt. Results land in vault/ as markdown.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.15em] text-zinc-500 mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 text-[11px]">
      <span className="text-zinc-500">{k}</span>
      <span className="text-zinc-300 truncate">{v}</span>
    </div>
  );
}

function now() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

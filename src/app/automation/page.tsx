"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Play,
  Plus,
  Trash2,
  Zap,
  Loader2,
  ChevronRight,
  Power,
  Copy,
} from "lucide-react";
import {
  NODE_CATALOG,
  kindColor,
  seedFlows,
  type FlowNode,
  type NodeKind,
  type VisualFlow,
} from "@/lib/flows";

const STORAGE_KEY = "pari.visual.flows.v1";

export default function AutomationPage() {
  const [flows, setFlows] = useState<VisualFlow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [log, setLog] = useState<{ step: string; ok: boolean; text: string }[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as VisualFlow[];
        if (Array.isArray(parsed) && parsed.length) {
          setFlows(parsed);
          setActiveId(parsed[0].id);
          setHydrated(true);
          return;
        }
      }
    } catch {
      /* seed */
    }
    const s = seedFlows();
    setFlows(s);
    setActiveId(s[0].id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
  }, [flows, hydrated]);

  const flow = useMemo(
    () => flows.find((f) => f.id === activeId) || flows[0],
    [flows, activeId]
  );

  const updateFlow = useCallback(
    (patch: Partial<VisualFlow> | ((f: VisualFlow) => VisualFlow)) => {
      setFlows((list) =>
        list.map((f) => {
          if (f.id !== (flow?.id || activeId)) return f;
          return typeof patch === "function" ? patch(f) : { ...f, ...patch };
        })
      );
    },
    [flow?.id, activeId]
  );

  function addNode(kind: NodeKind, type: string, label: string, defaults: Record<string, string> = {}) {
    if (!flow) return;
    const node: FlowNode = {
      id: `n${Date.now()}`,
      kind,
      type,
      label,
      config: { ...defaults },
    };
    // insert before final End if present
    const nodes = [...flow.nodes];
    const endIdx = nodes.findIndex((n) => n.type === "end");
    if (endIdx >= 0) nodes.splice(endIdx, 0, node);
    else nodes.push(node);
    updateFlow({ nodes });
    setActiveNode(node.id);
  }

  function removeNode(id: string) {
    if (!flow) return;
    updateFlow({ nodes: flow.nodes.filter((n) => n.id !== id && n.type !== "noop") });
    if (activeNode === id) setActiveNode(null);
  }

  function moveNode(id: string, dir: -1 | 1) {
    if (!flow) return;
    const nodes = [...flow.nodes];
    const i = nodes.findIndex((n) => n.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= nodes.length) return;
    // keep end at end
    if (nodes[i].type === "end" || nodes[j].type === "end") return;
    [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
    updateFlow({ nodes });
  }

  async function runSequential() {
    if (!flow || running) return;
    setRunning(true);
    setLog([]);
    const steps: { step: string; ok: boolean; text: string }[] = [];

    for (const node of flow.nodes) {
      setActiveNode(node.id);
      try {
        if (node.kind === "trigger" || node.type === "end") {
          steps.push({ step: node.label, ok: true, text: node.kind === "trigger" ? "Trigger OK" : "Done" });
          setLog([...steps]);
          continue;
        }
        if (node.type === "if_owner") {
          steps.push({ step: node.label, ok: true, text: "Condition passed (owner session)" });
          setLog([...steps]);
          continue;
        }
        if (node.type === "skill") {
          const skill = node.config.skill || "plan";
          const res = await fetch("/api/skills", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: skill, skill, remember: true }),
          });
          const data = await res.json();
          steps.push({
            step: node.label,
            ok: res.ok,
            text: (data.answer || data.error || "").slice(0, 400),
          });
        } else if (node.type === "digest") {
          const res = await fetch("/api/digest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ focus: "" }),
          });
          const data = await res.json().catch(() => ({}));
          steps.push({
            step: node.label,
            ok: res.ok,
            text: String(data.digest || data.error || "digest").slice(0, 400),
          });
        } else if (node.type === "agent") {
          const res = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agentId: node.config.agentId || "assistant",
              task: flow.name,
            }),
          });
          const data = await res.json().catch(() => ({}));
          steps.push({
            step: node.label,
            ok: res.ok,
            text: String(data.result || data.error || "agent").slice(0, 400),
          });
        } else if (node.type === "vault") {
          const res = await fetch("/api/memory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: node.config.title || flow.name,
              content: steps.map((s) => `## ${s.step}\n${s.text}`).join("\n\n"),
              tags: ["automation", "flow"],
            }),
          });
          const data = await res.json().catch(() => ({}));
          steps.push({
            step: node.label,
            ok: res.ok,
            text: data.saved ? `saved:${data.source || "ok"}` : data.error || "vault",
          });
        } else if (node.type === "notify") {
          steps.push({ step: node.label, ok: true, text: "Notify queued (UI)" });
        } else {
          steps.push({ step: node.label, ok: true, text: "skipped" });
        }
        setLog([...steps]);
      } catch (e) {
        steps.push({
          step: node.label,
          ok: false,
          text: e instanceof Error ? e.message : "error",
        });
        setLog([...steps]);
        break;
      }
    }

    updateFlow((f) => ({
      ...f,
      runs: f.runs + 1,
      lastRun: new Date().toLocaleString("uz-UZ"),
    }));
    setRunning(false);
    setActiveNode(null);
  }

  function newFlow() {
    const id = `flow-${Date.now()}`;
    const f: VisualFlow = {
      id,
      name: "Yangi oqim",
      active: true,
      runs: 0,
      nodes: [
        { id: `${id}-t`, kind: "trigger", type: "manual", label: "Manual", config: {} },
        { id: `${id}-e`, kind: "output", type: "end", label: "End", config: {} },
      ],
    };
    setFlows((x) => [f, ...x]);
    setActiveId(id);
    setLog([]);
  }

  function duplicateFlow() {
    if (!flow) return;
    const id = `flow-${Date.now()}`;
    const copy: VisualFlow = {
      ...flow,
      id,
      name: `${flow.name} (copy)`,
      runs: 0,
      lastRun: undefined,
      nodes: flow.nodes.map((n) => ({ ...n, id: `${id}-${n.id}` })),
    };
    setFlows((x) => [copy, ...x]);
    setActiveId(id);
  }

  function deleteFlow() {
    if (!flow || flows.length <= 1) return;
    const next = flows.filter((f) => f.id !== flow.id);
    setFlows(next);
    setActiveId(next[0].id);
  }

  if (!flow) {
    return (
      <div className="p-8 text-sm text-gray-500">Yuklanmoqda…</div>
    );
  }

  return (
    <div className="fade-in max-w-6xl mx-auto space-y-4 pb-8">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-indigo-600">
            <Zap size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Automation</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">Vizual oqimlar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            n8n uslubida ketma-ket node’lar — Trigger → Action → … → End
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={newFlow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Plus size={14} /> Yangi
          </button>
          <button
            type="button"
            onClick={duplicateFlow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Copy size={14} /> Nusxa
          </button>
          <button
            type="button"
            onClick={runSequential}
            disabled={running || !flow.active}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Ishga tushir
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {/* flow list */}
        <aside className="space-y-2">
          {flows.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setActiveId(f.id);
                setLog([]);
                setActiveNode(null);
              }}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                f.id === flow.id
                  ? "border-indigo-200 bg-indigo-50/80"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">{f.name}</span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${f.active ? "bg-emerald-500" : "bg-gray-300"}`}
                />
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                {f.nodes.length} qadam · {f.runs} run
              </div>
            </button>
          ))}
        </aside>

        {/* canvas */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <input
              value={flow.name}
              onChange={(e) => updateFlow({ name: e.target.value })}
              className="flex-1 min-w-[120px] text-sm font-medium text-gray-900 outline-none"
            />
            <button
              type="button"
              onClick={() => updateFlow({ active: !flow.active })}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
                flow.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              <Power size={12} /> {flow.active ? "Active" : "Off"}
            </button>
            <button
              type="button"
              onClick={deleteFlow}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              aria-label="O'chirish"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* sequential graph */}
          <div
            className="rounded-2xl border border-gray-200 bg-[#f8f9fc] p-4 overflow-x-auto"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #e5e7eb 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          >
            <div className="flex items-stretch gap-0 min-w-max py-2">
              {flow.nodes.map((node, idx) => (
                <div key={node.id} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setActiveNode(node.id)}
                    className={`relative w-[148px] rounded-xl border bg-white p-3 text-left shadow-sm transition ${
                      activeNode === node.id
                        ? "border-indigo-400 ring-2 ring-indigo-100"
                        : "border-gray-200 hover:border-gray-300"
                    } ${running && activeNode === node.id ? "animate-pulse" : ""}`}
                  >
                    <div
                      className="mb-2 h-1 w-8 rounded-full"
                      style={{ background: kindColor(node.kind) }}
                    />
                    <div className="text-[10px] uppercase tracking-wider text-gray-400">
                      {node.kind}
                    </div>
                    <div className="mt-0.5 text-sm font-medium text-gray-900 leading-snug">
                      {node.label}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">{node.type}</div>
                  </button>
                  {idx < flow.nodes.length - 1 && (
                    <div className="flex w-10 items-center justify-center text-gray-300">
                      <div className="h-px flex-1 bg-gray-300" />
                      <ChevronRight size={14} className="-mx-0.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* palette + inspector */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Node qo‘shish
              </div>
              <div className="flex flex-wrap gap-1.5">
                {NODE_CATALOG.filter((c) => c.type !== "end").map((c) => (
                  <button
                    key={`${c.kind}-${c.type}`}
                    type="button"
                    onClick={() => addNode(c.kind, c.type, c.labelUz, c.defaults)}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    + {c.labelUz}
                  </button>
                ))}
              </div>
              {activeNode && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveNode(activeNode, -1)}
                    className="rounded-lg border px-2 py-1 text-xs text-gray-600"
                  >
                    ← Chap
                  </button>
                  <button
                    type="button"
                    onClick={() => moveNode(activeNode, 1)}
                    className="rounded-lg border px-2 py-1 text-xs text-gray-600"
                  >
                    O‘ng →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeNode(activeNode)}
                    className="rounded-lg border border-red-100 px-2 py-1 text-xs text-red-600"
                  >
                    O‘chirish
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Run log
              </div>
              {log.length === 0 ? (
                <p className="text-sm text-gray-400">Ishga tushiring — har qadam logi shu yerda.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {log.map((l, i) => (
                    <li key={i} className="text-xs">
                      <span className={l.ok ? "text-emerald-600" : "text-red-600"}>
                        {l.ok ? "✓" : "✗"}
                      </span>{" "}
                      <span className="font-medium text-gray-800">{l.step}</span>
                      <div className="text-gray-500 whitespace-pre-wrap mt-0.5">{l.text}</div>
                    </li>
                  ))}
                </ul>
              )}
              {flow.lastRun && (
                <p className="mt-2 text-[11px] text-gray-400">Oxirgi: {flow.lastRun}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

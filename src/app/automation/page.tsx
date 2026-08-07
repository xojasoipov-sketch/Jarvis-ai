"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap, Plus, Play, Trash2, Power, Loader2,
  Clock, Webhook, MessageSquare, Bot, BarChart2, FileSpreadsheet,
  Mail, Globe, BookOpen, CheckCircle2, XCircle, Timer, Settings2,
  History, Copy, Check,
} from "lucide-react";
import type { AutoFlow, FlowRun, FlowRunStep } from "@/lib/automation-store";
import type { FlowNode } from "@/lib/flows";
import { nextRunAt, describeCron } from "@/lib/cron";

const NODE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  manual:         { label: "Qo'lda",        icon: Play,            color: "#6366f1" },
  schedule:       { label: "Jadval",         icon: Clock,           color: "#6366f1" },
  webhook:        { label: "Webhook",        icon: Webhook,         color: "#6366f1" },
  keyword:        { label: "Kalit so'z",     icon: MessageSquare,   color: "#6366f1" },
  digest:         { label: "Brifing",        icon: Zap,             color: "#0d9488" },
  telegram:       { label: "Telegram",       icon: MessageSquare,   color: "#0d9488" },
  agent:          { label: "Agent",          icon: Bot,             color: "#0d9488" },
  skill:          { label: "Skill",          icon: Zap,             color: "#0d9488" },
  finance_report: { label: "Moliya hisobot", icon: BarChart2,       color: "#0d9488" },
  sheets:         { label: "Google Sheets",  icon: FileSpreadsheet, color: "#0d9488" },
  email:          { label: "Email",          icon: Mail,            color: "#0d9488" },
  http_request:   { label: "HTTP So'rov",    icon: Globe,           color: "#0d9488" },
  vault:          { label: "Vault",          icon: BookOpen,        color: "#0d9488" },
  wait:           { label: "Kutish",         icon: Timer,           color: "#d97706" },
  if_owner:       { label: "Faqat egasi",    icon: Settings2,       color: "#d97706" },
  end:            { label: "Tugash",         icon: CheckCircle2,    color: "#64748b" },
};

function nodeMeta(type: string) {
  return NODE_META[type] || { label: type, icon: Zap, color: "#6366f1" };
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: "Qo'lda", schedule: "Jadval", webhook: "Webhook", keyword: "Kalit so'z",
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 14,
  padding: 16,
};

export default function AutomationPage() {
  const [flows, setFlows] = useState<AutoFlow[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [liveSteps, setLiveSteps] = useState<FlowRunStep[]>([]);
  const [tab, setTab] = useState<"flow" | "history" | "new">("flow");
  const [copied, setCopied] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTrigger, setNewTrigger] = useState<"manual" | "schedule" | "webhook">("manual");
  const [newCron, setNewCron] = useState("0 9 * * *");
  const [saving, setSaving] = useState(false);

  const active = flows.find((f) => f.id === activeId) || null;

  const fetchFlows = useCallback(async () => {
    const res = await fetch("/api/automation/flows");
    if (!res.ok) return;
    const data = await res.json();
    setFlows(data.flows || []);
    if (!activeId && data.flows?.length) setActiveId(data.flows[0].id);
    setLoading(false);
  }, [activeId]);

  const fetchRuns = useCallback(async (id: string) => {
    const res = await fetch(`/api/automation/flows/${id}/runs`);
    if (!res.ok) return;
    const data = await res.json();
    setRuns(data.runs || []);
  }, []);

  useEffect(() => { fetchFlows(); }, [fetchFlows]);
  useEffect(() => {
    if (activeId) fetchRuns(activeId);
  }, [activeId, fetchRuns]);

  async function toggleActive() {
    if (!active) return;
    await fetch(`/api/automation/flows/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active.active }),
    });
    fetchFlows();
  }

  async function deleteFlow() {
    if (!active || !confirm(`"${active.name}" ni ochirish?`)) return;
    await fetch(`/api/automation/flows/${active.id}`, { method: "DELETE" });
    setActiveId("");
    fetchFlows();
  }

  async function runFlowManual() {
    if (!active || running) return;
    setRunning(true);
    setLiveSteps([]);
    for (const node of active.nodes) {
      setActiveNode(node.id);
      await new Promise((r) => setTimeout(r, 250));
    }
    const res = await fetch(`/api/automation/flows/${active.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const data = await res.json();
      setLiveSteps(data.steps || []);
      fetchRuns(active.id);
      fetchFlows();
    }
    setActiveNode(null);
    setRunning(false);
  }

  async function saveNewFlow() {
    if (!newName.trim()) return;
    setSaving(true);
    const nodes: FlowNode[] = [
      { id: "n1", kind: "trigger", type: newTrigger, label: TRIGGER_LABELS[newTrigger], config: newTrigger === "schedule" ? { cron: newCron } : {} },
      { id: "n2", kind: "action", type: "agent", label: "Assistant agent", config: { agentId: "assistant" } },
      { id: "n3", kind: "action", type: "telegram", label: "Telegramga yuborish", config: {} },
      { id: "n4", kind: "output", type: "end", label: "Tugash", config: {} },
    ];
    const res = await fetch("/api/automation/flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc, nodes, trigger_type: newTrigger, trigger_config: newTrigger === "schedule" ? { cron: newCron } : {}, active: true }),
    });
    if (res.ok) {
      const flow = await res.json();
      setNewName(""); setNewDesc(""); setTab("flow");
      await fetchFlows();
      setActiveId(flow.id);
    }
    setSaving(false);
  }

  const webhookUrl = active?.trigger_type === "webhook"
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/automation/webhook?secret=${active.trigger_config.secret || ""}`
    : null;

  const inp: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
    color: "#fff", padding: "10px 14px", fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#0b0d14", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#ff6a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Automation</h1>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Visual flow runner — Telegram, Sheets, Email, Webhook</p>
          </div>
          <button onClick={() => setTab("new")} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#ff6a1a", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} /> Yangi flow
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading ? <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Yuklanmoqda...</div> :
              flows.map((f) => (
                <button key={f.id} onClick={() => { setActiveId(f.id); setTab("flow"); setLiveSteps([]); }}
                  style={{ textAlign: "left", padding: "12px 14px", background: f.id === activeId ? "rgba(255,106,26,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${f.id === activeId ? "rgba(255,106,26,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, cursor: "pointer", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: f.active ? "#22c55e" : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {TRIGGER_LABELS[f.trigger_type] || f.trigger_type} · {f.runs} marta
                    {f.trigger_type === "schedule" && f.trigger_config.cron && (() => {
                      const next = nextRunAt(f.trigger_config.cron);
                      if (!next) return null;
                      const diff = new Date(next).getTime() - Date.now();
                      const mins = Math.round(diff / 60000);
                      const label = mins < 60 ? `${mins}d` : mins < 1440 ? `${Math.round(mins/60)}s` : `${Math.round(mins/1440)}k`;
                      return <span style={{ color: "#f59e0b" }}> · {label} keyin</span>;
                    })()}
                  </div>
                </button>
              ))
            }
          </div>

          {/* Main */}
          <div>
            {tab === "new" ? (
              <div style={{ ...card }}>
                <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Yangi flow</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input placeholder="Flow nomi *" value={newName} onChange={(e) => setNewName(e.target.value)} style={inp} />
                  <input placeholder="Tavsif (ixtiyoriy)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={inp} />
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>Trigger turi</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["manual", "schedule", "webhook"] as const).map((t) => (
                        <button key={t} onClick={() => setNewTrigger(t)}
                          style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: newTrigger === t ? "#ff6a1a" : "rgba(255,255,255,0.05)", border: `1px solid ${newTrigger === t ? "#ff6a1a" : "rgba(255,255,255,0.08)"}`, color: newTrigger === t ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: newTrigger === t ? 600 : 400 }}>
                          {TRIGGER_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {newTrigger === "schedule" && (
                    <input placeholder="Cron (masalan: 0 9 * * *)" value={newCron} onChange={(e) => setNewCron(e.target.value)} style={inp} />
                  )}
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Standart nodes: Trigger → Agent → Telegram → Tugash</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button onClick={saveNewFlow} disabled={saving || !newName.trim()}
                      style={{ padding: "10px 20px", background: "#ff6a1a", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: saving || !newName.trim() ? 0.5 : 1 }}>
                      {saving ? "Saqlanmoqda..." : "Yaratish"}
                    </button>
                    <button onClick={() => setTab("flow")}
                      style={{ padding: "10px 20px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer" }}>
                      Bekor
                    </button>
                  </div>
                </div>
              </div>
            ) : active ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Flow header */}
                <div style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{active.name}</div>
                    {active.description && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{active.description}</div>}
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                      {TRIGGER_LABELS[active.trigger_type]} · {active.nodes.length} node · {active.runs} ijro
                      {active.last_run_at && ` · oxirgi: ${new Date(active.last_run_at).toLocaleString("uz-UZ")}`}
                    </div>
                    {active.trigger_type === "schedule" && active.trigger_config.cron && (() => {
                      const cron = active.trigger_config.cron;
                      const next = nextRunAt(cron);
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, fontSize: 11 }}>
                          <span style={{ padding: "3px 8px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, color: "#f59e0b" }}>
                            {describeCron(cron)}
                          </span>
                          {next && (
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>
                              keyingi: {new Date(next).toLocaleString("uz-UZ")}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setTab(tab === "history" ? "flow" : "history")}
                      style={{ padding: "7px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <History size={13} /> Tarix
                    </button>
                    <button onClick={toggleActive}
                      style={{ padding: "7px 10px", background: active.active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${active.active ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", color: active.active ? "#22c55e" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <Power size={13} /> {active.active ? "Faol" : "Nofaol"}
                    </button>
                    <button onClick={runFlowManual} disabled={running || !active.active}
                      style={{ padding: "7px 14px", background: "#ff6a1a", border: "none", borderRadius: 8, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, opacity: running || !active.active ? 0.5 : 1 }}>
                      {running ? <Loader2 size={13} /> : <Play size={13} />} Ishga tushir
                    </button>
                    <button onClick={deleteFlow}
                      style={{ padding: "7px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Webhook URL */}
                {webhookUrl && (
                  <div style={{ ...card, background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.2)" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Webhook URL</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <code style={{ flex: 1, fontSize: 11, color: "#a5b4fc", wordBreak: "break-all" }}>{webhookUrl}</code>
                      <button onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        style={{ padding: "5px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 4, fontSize: 11, flexShrink: 0 }}>
                        {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                        {copied ? "Nusxalandi" : "Nusxa"}
                      </button>
                    </div>
                  </div>
                )}

                {/* History */}
                {tab === "history" ? (
                  <div style={{ ...card }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 16, color: "rgba(255,255,255,0.5)" }}>IJRO TARIXI</div>
                    {runs.length === 0 ? (
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Hali ijro yo&apos;q</div>
                    ) : runs.map((run) => (
                      <div key={run.id} style={{ padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: run.status === "done" ? "#22c55e" : run.status === "error" ? "#ef4444" : "#f59e0b" }}>
                            {run.status === "done" ? "✓ Muvaffaq" : run.status === "error" ? "✗ Xato" : "⟳ Ishlayapti"}
                          </span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{new Date(run.started_at).toLocaleString("uz-UZ")}</span>
                        </div>
                        {run.steps.map((s, i) => {
                          const m = nodeMeta(s.type);
                          const Icon = m.icon;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 4 }}>
                              <Icon size={11} color={m.color} />
                              <span style={{ color: "rgba(255,255,255,0.5)", minWidth: 80 }}>{m.label}</span>
                              {s.ok ? <CheckCircle2 size={10} color="#22c55e" /> : <XCircle size={10} color="#ef4444" />}
                              <span style={{ color: "rgba(255,255,255,0.3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.output}</span>
                              <span style={{ color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{s.ms}ms</span>
                            </div>
                          );
                        })}
                        {run.error && <div style={{ marginTop: 8, fontSize: 11, color: "#ef4444" }}>✗ {run.error}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Pipeline */
                  <div style={{ ...card }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 16, color: "rgba(255,255,255,0.5)" }}>FLOW PIPELINE</div>
                    {active.nodes.map((node, i) => {
                      const m = nodeMeta(node.type);
                      const Icon = m.icon;
                      const isActive = activeNode === node.id;
                      const step = liveSteps.find((s) => s.node_id === node.id);
                      return (
                        <div key={node.id}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, transition: "background 0.2s", background: isActive ? "rgba(255,106,26,0.08)" : step ? (step.ok ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)") : "rgba(255,255,255,0.02)", border: `1px solid ${isActive ? "rgba(255,106,26,0.25)" : step ? (step.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)") : "rgba(255,255,255,0.05)"}` }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.color}22`, border: `1px solid ${m.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {isActive ? <Loader2 size={16} color={m.color} /> : <Icon size={16} color={m.color} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{node.label}</div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                                {m.label}
                                {node.config.cron && <span> · {describeCron(node.config.cron)}</span>}
                                {node.config.agentId && <span> · {node.config.agentId}</span>}
                              </div>
                              {step && (
                                <div style={{ fontSize: 11, color: step.ok ? "#22c55e" : "#ef4444", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
                                  {step.ok ? "✓" : "✗"} {step.output} <span style={{ color: "rgba(255,255,255,0.25)" }}>({step.ms}ms)</span>
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 600, padding: "3px 7px", background: "rgba(255,255,255,0.04)", borderRadius: 6 }}>{node.kind.toUpperCase()}</div>
                          </div>
                          {i < active.nodes.length - 1 && (
                            <div style={{ display: "flex", justifyContent: "center", padding: "3px 0" }}>
                              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.07)" }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {liveSteps.length > 0 && !running && (
                      <div style={{ marginTop: 16, padding: 14, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 10 }}>
                        <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginBottom: 8 }}>IJRO NATIJASI</div>
                        {liveSteps.map((s, i) => {
                          const m = nodeMeta(s.type);
                          return <div key={i} style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}><span style={{ color: m.color }}>{m.label}</span>: {s.output}</div>;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : !loading ? (
              <div style={{ ...card, textAlign: "center", padding: 40 }}>
                <Zap size={32} color="rgba(255,255,255,0.15)" style={{ marginBottom: 12 }} />
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Flow tanlang yoki yangi yarating</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera, Wifi, WifiOff, RefreshCw, Plus, Trash2, Activity,
  Eye, AlertTriangle, Clock, MapPin, Zap, ChevronRight, X,
  Shield, Video, Image, Settings,
} from "lucide-react";

type CamStatus = "online" | "offline" | "error" | "unknown";

type CameraRow = {
  id: string;
  name: string;
  location: string;
  provider: string;
  status: CamStatus;
  last_seen: string | null;
};

type EventRow = {
  id: string;
  camera_id: string;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  started_at: string;
  snapshot_url?: string;
  ai_summary?: string;
  objects: { type: string; confidence: number }[];
};

type AddForm = { name: string; provider: string; location: string; serial: string; rtsp_url: string; app_key: string; app_secret: string };

const STATUS_COLOR: Record<CamStatus, string> = {
  online: "#22c55e",
  offline: "#ef4444",
  error: "#f59e0b",
  unknown: "#6b7280",
};

const SEVERITY_COLOR: Record<string, string> = {
  low: "#6b7280",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

const EVENT_ICON: Record<string, string> = {
  person_detected: "👤",
  vehicle_detected: "🚗",
  animal_detected: "🐾",
  motion_detected: "🌀",
  camera_offline: "📵",
  camera_online: "📡",
  restricted_zone: "🚫",
  suspicious_activity: "⚠️",
};

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.round(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
  return `${Math.round(diff / 86400000)}d`;
}

// ─── Add Camera Modal ─────────────────────────────────────────────────────────
function AddCameraModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState<AddForm>({ name: "", provider: "ezviz", location: "", serial: "", rtsp_url: "", app_key: "", app_secret: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.name || !form.location) { setError("Nom va joylashuv kerak"); return; }
    setLoading(true); setError("");
    const credentials: Record<string, string> = {};
    if (form.app_key) credentials.app_key = form.app_key;
    if (form.app_secret) credentials.app_secret = form.app_secret;
    try {
      const res = await fetch("/api/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, provider: form.provider, location: form.location, serial: form.serial, rtsp_url: form.rtsp_url, credentials }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; setError(d.error || "Xato"); setLoading(false); return; }
      onAdded();
    } catch (e) { setError(e instanceof Error ? e.message : "Xato"); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Yangi kamera qo'shish</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {[
          { label: "Kamera nomi *", key: "name", placeholder: "Darvoza kamerasi" },
          { label: "Joylashuv *", key: "location", placeholder: "gate / yard / garage" },
          { label: "Serial (EZVIZ uchun)", key: "serial", placeholder: "D12345678" },
          { label: "RTSP URL (to'g'ridan-to'g'ri)", key: "rtsp_url", placeholder: "rtsp://..." },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs text-white/50 mb-1 block">{f.label}</label>
            <input
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              value={form[f.key as keyof AddForm]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
            />
          </div>
        ))}

        <div>
          <label className="text-xs text-white/50 mb-1 block">Provider</label>
          <select
            className="w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm text-white focus:outline-none"
            value={form.provider}
            onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
          >
            {["ezviz", "rtsp", "onvif", "mock"].map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
        </div>

        {form.provider === "ezviz" && (
          <div className="space-y-3 border border-white/5 rounded-xl p-4 bg-white/2">
            <p className="text-xs text-white/40">EZVIZ API credentials (open.ys7.com)</p>
            {["app_key", "app_secret"].map(k => (
              <div key={k}>
                <label className="text-xs text-white/50 mb-1 block">{k}</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none"
                  value={form[k as keyof AddForm]}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  placeholder={`EZVIZ ${k}`}
                />
              </div>
            ))}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-lg bg-[#ff6a1a] py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50 transition"
        >
          {loading ? "Qo'shilmoqda..." : "Kamera qo'shish"}
        </button>
      </div>
    </div>
  );
}

// ─── Camera Card ──────────────────────────────────────────────────────────────
function CameraCard({ cam, onClick }: { cam: CameraRow; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-white/8 bg-white/3 p-5 hover:border-white/16 hover:bg-white/5 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${STATUS_COLOR[cam.status]}18` }}>
            <Camera size={16} style={{ color: STATUS_COLOR[cam.status] }} />
          </div>
          <div>
            <p className="text-sm font-medium text-white leading-tight">{cam.name}</p>
            <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {cam.location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: `${STATUS_COLOR[cam.status]}18`, color: STATUS_COLOR[cam.status] }}>
          {cam.status === "online" ? <Wifi size={11} /> : <WifiOff size={11} />}
          {cam.status}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-white/30">
        <span className="uppercase tracking-wider">{cam.provider}</span>
        {cam.last_seen && (
          <span className="flex items-center gap-1"><Clock size={10} /> {timeSince(cam.last_seen)}</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition text-xs text-white/40">
        <span>Ko'rish</span><ChevronRight size={12} />
      </div>
    </button>
  );
}

// ─── Event Item ───────────────────────────────────────────────────────────────
function EventItem({ evt, cameras }: { evt: EventRow; cameras: CameraRow[] }) {
  const cam = cameras.find(c => c.id === evt.camera_id);
  const icon = EVENT_ICON[evt.event_type] || "📷";
  const color = SEVERITY_COLOR[evt.severity];
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{ background: `${color}18` }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80">
          {evt.event_type.replace(/_/g, " ")}
          {cam && <span className="text-white/40 ml-2">— {cam.name}</span>}
        </p>
        {evt.ai_summary && <p className="text-xs text-white/40 mt-0.5 truncate">{evt.ai_summary}</p>}
      </div>
      <span className="text-xs text-white/30 flex-shrink-0">{timeSince(evt.started_at)}</span>
    </div>
  );
}

// ─── Camera Detail Panel ──────────────────────────────────────────────────────
function CameraDetail({ cam, onClose }: { cam: CameraRow; onClose: () => void }) {
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ summary: string; objects: { type: string; confidence: number }[] } | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch(`/api/cameras/events?camera_id=${cam.id}&limit=10`)
      .then(r => r.json() as Promise<{ events: EventRow[] }>)
      .then(d => setEvents(d.events || []))
      .catch(() => {});
  }, [cam.id]);

  const takeSnap = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cameras/${cam.id}/snapshot`, { method: "POST" });
      const d = await res.json() as { url?: string };
      if (d.url) setSnapshot(d.url);
    } finally { setLoading(false); }
  };

  const doAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/cameras/${cam.id}/analyze`, { method: "POST" });
      const d = await res.json() as { snapshot?: { url: string }; analysis?: typeof analysis };
      if (d.snapshot?.url) setSnapshot(d.snapshot.url);
      if (d.analysis) setAnalysis(d.analysis);
    } finally { setAnalyzing(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/50">
      <div className="w-full max-w-md h-full bg-[#0d0d0d] border-l border-white/8 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${STATUS_COLOR[cam.status]}18` }}>
              <Camera size={14} style={{ color: STATUS_COLOR[cam.status] }} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{cam.name}</p>
              <p className="text-xs text-white/40">{cam.location}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Snapshot */}
          <div>
            {snapshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={snapshot} alt="Snapshot" className="w-full rounded-xl object-cover" style={{ aspectRatio: "16/9" }} />
            ) : (
              <div className="w-full rounded-xl bg-white/3 border border-white/8 flex items-center justify-center" style={{ aspectRatio: "16/9" }}>
                <Camera size={32} className="text-white/20" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={takeSnap}
              disabled={loading}
              className="flex items-center gap-2 justify-center rounded-xl border border-white/10 py-2.5 text-sm text-white/70 hover:bg-white/5 disabled:opacity-50 transition"
            >
              <Image size={14} /> {loading ? "..." : "Snapshot"}
            </button>
            <button
              onClick={doAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 justify-center rounded-xl bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 py-2.5 text-sm text-[#ff6a1a] hover:bg-[#ff6a1a]/20 disabled:opacity-50 transition"
            >
              <Eye size={14} /> {analyzing ? "Tahlil..." : "AI Tahlil"}
            </button>
          </div>

          {/* Analysis result */}
          {analysis && (
            <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">AI Tahlil natijasi</p>
              <p className="text-sm text-white/80">{analysis.summary}</p>
              {analysis.objects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {analysis.objects.map((o, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                      {o.type} {Math.round(o.confidence * 100)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent events */}
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">So'nggi hodisalar</p>
            {events.length === 0 ? (
              <p className="text-sm text-white/30">Hodisalar yo'q</p>
            ) : (
              <div>
                {events.map(e => (
                  <EventItem key={e.id} evt={e} cameras={[cam as CameraRow]} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selected, setSelected] = useState<CameraRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"cameras" | "events">("cameras");

  const load = useCallback(async () => {
    setLoading(true);
    const [camRes, evtRes] = await Promise.all([
      fetch("/api/cameras").then(r => r.json() as Promise<{ cameras: CameraRow[] }>).catch(() => ({ cameras: [] })),
      fetch("/api/cameras/events?limit=30").then(r => r.json() as Promise<{ events: EventRow[] }>).catch(() => ({ events: [] })),
    ]);
    setCameras(camRes.cameras || []);
    setEvents(evtRes.events || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // SSE for real-time events
  useEffect(() => {
    // TODO: WebSocket/SSE real-time updates — hozir polling
    const iv = setInterval(() => {
      fetch("/api/cameras/events?limit=5")
        .then(r => r.json() as Promise<{ events: EventRow[] }>)
        .then(d => {
          if (d.events?.length) setEvents(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEvts = d.events.filter(e => !existingIds.has(e.id));
            return newEvts.length ? [...newEvts, ...prev].slice(0, 100) : prev;
          });
        }).catch(() => {});
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  const online = cameras.filter(c => c.status === "online").length;
  const offline = cameras.filter(c => c.status !== "online" && c.status !== "unknown").length;

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Camera size={24} className="text-[#ff6a1a]" />
              Kameralar
            </h1>
            <p className="text-sm text-white/40 mt-1">EZVIZ · RTSP · AI Vision Monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => void load()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-white/60 hover:bg-white/5 transition">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Yangilash
            </button>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6a1a] text-sm font-medium text-white hover:brightness-110 transition">
              <Plus size={14} /> Kamera qo'shish
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Jami", value: cameras.length, icon: Camera, color: "#6b7280" },
            { label: "Online", value: online, icon: Wifi, color: "#22c55e" },
            { label: "Offline", value: offline, icon: WifiOff, color: "#ef4444" },
            { label: "Hodisalar", value: events.length, icon: Activity, color: "#ff6a1a" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-white/8 bg-white/2 p-5">
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={14} style={{ color: s.color }} />
                <span className="text-xs text-white/40">{s.label}</span>
              </div>
              <p className="text-2xl font-semibold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/8 bg-white/2 p-1 w-fit">
          {(["cameras", "events"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              {t === "cameras" ? "Kameralar" : "Hodisalar"}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "cameras" ? (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl border border-white/5 bg-white/2 h-40 animate-pulse" />
              ))}
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-20">
              <Camera size={48} className="text-white/10 mx-auto mb-4" />
              <p className="text-white/30">Hali kamera qo'shilmagan</p>
              <button onClick={() => setShowAdd(true)} className="mt-4 text-sm text-[#ff6a1a] hover:underline">
                Birinchi kamerani qo'shish →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cameras.map(c => (
                <CameraCard key={c.id} cam={c} onClick={() => setSelected(c)} />
              ))}
            </div>
          )
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/2 divide-y divide-white/5">
            {events.length === 0 ? (
              <div className="py-16 text-center text-white/30 text-sm">Hodisalar yo'q</div>
            ) : (
              events.map(e => <EventItem key={e.id} evt={e} cameras={cameras} />)
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && <AddCameraModal onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); void load(); }} />}
      {selected && <CameraDetail cam={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

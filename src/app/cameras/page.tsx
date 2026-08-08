"use client";

import { useEffect, useCallback, useState } from "react";
import {
  Camera, Wifi, WifiOff, RefreshCw, Plus, Activity,
  Eye, Clock, MapPin, ChevronRight, X, Video, Image,
  Play, AlertCircle, ExternalLink, Settings, Zap,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
type CamStatus = "online" | "offline" | "error" | "unknown";

type CameraRow = {
  id: string;
  name: string;
  location: string;
  provider: string;
  status: CamStatus;
  last_seen: string | null;
  serial?: string;
  capabilities?: {
    live: boolean; snapshot: boolean; ptz: boolean; audio: boolean;
  };
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

type AnalysisResult = {
  snapshot?: { url: string };
  analysis?: { summary: string; objects: { type: string; confidence: number }[]; risk: string };
};

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<CamStatus, string> = {
  online: "#22c55e", offline: "#ef4444", error: "#f59e0b", unknown: "#6b7280",
};

const SEVERITY_COLOR: Record<string, string> = {
  low: "#6b7280", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626",
};

const EVENT_ICON: Record<string, string> = {
  person_detected: "👤", vehicle_detected: "🚗", animal_detected: "🐾",
  motion_detected: "🌀", camera_offline: "📵", camera_online: "📡",
  restricted_zone: "🚫", suspicious_activity: "⚠️", package_detected: "📦",
};

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.round(diff / 1000)}s oldin`;
  if (diff < 3600000) return `${Math.round(diff / 60000)}m oldin`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}s oldin`;
  return `${Math.round(diff / 86400000)}kun oldin`;
}

// ─── Camera Detail Panel ──────────────────────────────────────────────────────
function CameraDetail({ cam, onClose }: { cam: CameraRow; onClose: () => void }) {
  const [snap, setSnap] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult["analysis"] | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState<"snap" | "stream" | "analyze" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/cameras/events?camera_id=${cam.id}&limit=10`)
      .then(r => r.json() as Promise<{ events: EventRow[] }>)
      .then(d => setEvents(d.events || []))
      .catch(() => {});
  }, [cam.id]);

  const doSnapshot = async () => {
    setLoading("snap"); setError(null);
    try {
      const res = await fetch(`/api/cameras/${cam.id}/snapshot`, { method: "POST" });
      const d = await res.json() as { url?: string; error?: string };
      if (!res.ok || d.error) { setError(d.error || "Snapshot olinmadi"); return; }
      if (d.url) setSnap(d.url);
    } catch (e) { setError(e instanceof Error ? e.message : "Xato"); }
    finally { setLoading(null); }
  };

  const doStream = async () => {
    setLoading("stream"); setError(null);
    try {
      const res = await fetch(`/api/cameras/${cam.id}/stream`);
      const d = await res.json() as { hls_url?: string; rtsp_url?: string; error?: string };
      if (!res.ok || d.error) { setError(d.error || "Stream topilmadi"); return; }
      setStreamUrl(d.hls_url || d.rtsp_url || null);
    } catch (e) { setError(e instanceof Error ? e.message : "Xato"); }
    finally { setLoading(null); }
  };

  const doAnalyze = async () => {
    setLoading("analyze"); setError(null);
    try {
      const res = await fetch(`/api/cameras/${cam.id}/analyze`, { method: "POST" });
      const d = await res.json() as AnalysisResult & { error?: string };
      if (!res.ok || d.error) { setError(d.error || "Tahlil amalga oshmadi"); return; }
      if (d.snapshot?.url) setSnap(d.snapshot.url);
      if (d.analysis) setAnalysis(d.analysis);
    } catch (e) { setError(e instanceof Error ? e.message : "Xato"); }
    finally { setLoading(null); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-end bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full md:max-w-lg h-[92vh] md:h-full bg-[#0c0c0c] border-l border-white/8 flex flex-col overflow-hidden md:rounded-none rounded-t-3xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/8 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${STATUS_COLOR[cam.status]}15` }}>
            <Camera size={16} style={{ color: STATUS_COLOR[cam.status] }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{cam.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color: STATUS_COLOR[cam.status] }}>
                {cam.status === "online" ? "● Online" : cam.status === "offline" ? "○ Offline" : `○ ${cam.status}`}
              </span>
              <span className="text-white/20">·</span>
              <span className="text-xs text-white/30">{cam.location}</span>
              {cam.serial && <span className="text-xs text-white/20">·{cam.serial.slice(-6)}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white p-1 transition"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Preview area */}
          <div className="p-4">
            {snap ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={snap} alt="Kamera snapshot" className="w-full rounded-2xl object-cover bg-black" style={{ aspectRatio: "16/9" }} />
            ) : streamUrl ? (
              <div className="w-full rounded-2xl bg-black border border-white/8 overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <video
                  src={streamUrl}
                  autoPlay muted playsInline controls
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full rounded-2xl bg-white/2 border border-white/6 flex flex-col items-center justify-center" style={{ aspectRatio: "16/9" }}>
                <Camera size={40} className="text-white/10 mb-3" />
                <p className="text-xs text-white/30">Snapshot yoki Live stream tanlang</p>
              </div>
            )}

            {streamUrl && (
              <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
                <Play size={10} />
                <span className="truncate">HLS: {streamUrl.slice(0, 60)}...</span>
                <a href={streamUrl} target="_blank" rel="noreferrer" className="text-[#ff6a1a] hover:underline flex-shrink-0">Ochish</a>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={doSnapshot}
              disabled={loading !== null || cam.status !== "online"}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 py-3 text-xs text-white/60 hover:bg-white/6 disabled:opacity-40 transition"
            >
              {loading === "snap" ? <RefreshCw size={14} className="animate-spin" /> : <Image size={14} />}
              Snapshot
            </button>
            <button
              onClick={doStream}
              disabled={loading !== null || cam.status !== "online" || !cam.capabilities?.live}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 py-3 text-xs text-white/60 hover:bg-white/6 disabled:opacity-40 transition"
            >
              {loading === "stream" ? <RefreshCw size={14} className="animate-spin" /> : <Video size={14} />}
              Live
            </button>
            <button
              onClick={doAnalyze}
              disabled={loading !== null || cam.status !== "online"}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[#ff6a1a]/20 bg-[#ff6a1a]/5 py-3 text-xs text-[#ff6a1a] hover:bg-[#ff6a1a]/10 disabled:opacity-40 transition"
            >
              {loading === "analyze" ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
              AI Tahlil
            </button>
          </div>

          {error && (
            <div className="mx-4 mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 flex items-start gap-2 text-sm text-red-400">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* AI analysis */}
          {analysis && (
            <div className="mx-4 mb-4 rounded-xl border border-white/8 bg-white/2 p-4 space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-wider">AI Tahlil</p>
              <p className="text-sm text-white/80 leading-relaxed">{analysis.summary}</p>
              {analysis.objects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {analysis.objects.map((o, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-white/60">
                      {o.type} {Math.round(o.confidence * 100)}%
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30">Risk:</span>
                <span className="text-xs font-medium" style={{
                  color: analysis.risk === "critical" ? "#dc2626" : analysis.risk === "high" ? "#ef4444" : analysis.risk === "medium" ? "#f59e0b" : "#6b7280",
                }}>{analysis.risk}</span>
              </div>
            </div>
          )}

          {/* Events */}
          <div className="px-4 pb-6">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">So'nggi hodisalar</p>
            {events.length === 0 ? (
              <p className="text-sm text-white/25 py-4 text-center">Hodisalar yo'q</p>
            ) : events.map(e => {
              const icon = EVENT_ICON[e.event_type] || "📷";
              const color = SEVERITY_COLOR[e.severity];
              return (
                <div key={e.id} className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm" style={{ background: `${color}18` }}>{icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70">{e.event_type.replace(/_/g, " ")}</p>
                    {e.ai_summary && <p className="text-xs text-white/35 mt-0.5 truncate">{e.ai_summary}</p>}
                  </div>
                  <span className="text-xs text-white/25 flex-shrink-0">{timeSince(e.started_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Camera Card ──────────────────────────────────────────────────────────────
function CameraCard({ cam, onClick }: { cam: CameraRow; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border border-white/8 bg-white/2 p-5 hover:border-white/14 hover:bg-white/4 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${STATUS_COLOR[cam.status]}12` }}>
            <Camera size={16} style={{ color: STATUS_COLOR[cam.status] }} />
            {cam.status === "online" && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400 border border-[#0c0c0c]" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white leading-tight">{cam.name}</p>
            <p className="text-xs text-white/35 flex items-center gap-1 mt-0.5">
              <MapPin size={9} />{cam.location}
            </p>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full" style={{
          background: `${STATUS_COLOR[cam.status]}12`,
          color: STATUS_COLOR[cam.status],
        }}>
          {cam.status}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-white/25 uppercase tracking-wider">{cam.provider}</span>
        <div className="flex items-center gap-3">
          {cam.last_seen && (
            <span className="text-xs text-white/25 flex items-center gap-1"><Clock size={9} /> {timeSince(cam.last_seen)}</span>
          )}
          <ChevronRight size={12} className="text-white/20 group-hover:text-white/40 transition" />
        </div>
      </div>
    </button>
  );
}

// ─── Event Row ────────────────────────────────────────────────────────────────
function EventRow({ evt, cameras }: { evt: EventRow; cameras: CameraRow[] }) {
  const cam = cameras.find(c => c.id === evt.camera_id);
  const icon = EVENT_ICON[evt.event_type] || "📷";
  const color = SEVERITY_COLOR[evt.severity];
  return (
    <div className="flex items-start gap-3 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/2 transition">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm" style={{ background: `${color}15` }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80">
          {evt.event_type.replace(/_/g, " ")}
          {cam && <span className="text-white/35 ml-2">— {cam.name}</span>}
        </p>
        {evt.ai_summary && <p className="text-xs text-white/35 mt-0.5 truncate">{evt.ai_summary}</p>}
      </div>
      <span className="text-xs text-white/25 flex-shrink-0">{timeSince(evt.started_at)}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CamerasPage() {
  const [cameras, setCameras] = useState<CameraRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selected, setSelected] = useState<CameraRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<"cameras" | "events">("cameras");
  const [syncMsg, setSyncMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [camRes, evtRes] = await Promise.all([
      fetch("/api/cameras").then(r => r.json() as Promise<{ cameras: CameraRow[] }>).catch(() => ({ cameras: [] })),
      fetch("/api/cameras/events?limit=50").then(r => r.json() as Promise<{ events: EventRow[] }>).catch(() => ({ events: [] })),
    ]);
    setCameras(camRes.cameras || []);
    setEvents(evtRes.events || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch("/api/cameras/ezviz/sync", { method: "POST" });
      const d = await res.json() as { ok: boolean; message?: string; error?: string; total?: number };
      if (d.ok) {
        setSyncMsg(`✓ ${d.total} ta kamera yangilandi`);
        await load();
      } else {
        setSyncMsg(`✗ ${d.error || "Xato"}`);
      }
    } finally { setSyncing(false); }
  };

  const online = cameras.filter(c => c.status === "online").length;
  const offline = cameras.filter(c => c.status !== "online" && c.status !== "unknown").length;
  const noEzviz = cameras.every(c => c.provider !== "ezviz");

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2.5">
              <Camera size={20} className="text-[#ff6a1a]" /> Kameralar
            </h1>
            <p className="text-xs text-white/35 mt-0.5">AI Vision · EZVIZ · Real-time</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} disabled={loading} className="p-2 rounded-xl border border-white/8 text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 transition">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/8 text-xs text-white/50 hover:bg-white/5 disabled:opacity-40 transition">
              <Zap size={12} className={syncing ? "animate-pulse" : ""} />
              {syncing ? "Yangilanmoqda..." : "EZVIZ Sync"}
            </button>
            <Link href="/cameras/connect" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ff6a1a]/10 border border-[#ff6a1a]/20 text-xs text-[#ff6a1a] hover:bg-[#ff6a1a]/20 transition">
              <Settings size={12} /> Sozlash
            </Link>
          </div>
        </div>

        {syncMsg && (
          <div className={`rounded-xl border px-4 py-2.5 text-sm ${syncMsg.startsWith("✓") ? "border-green-500/20 bg-green-500/5 text-green-400" : "border-red-500/20 bg-red-500/5 text-red-400"}`}>
            {syncMsg}
          </div>
        )}

        {/* No cameras */}
        {!loading && cameras.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <Camera size={40} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/40 mb-2">Hali kamera yo'q</p>
            <p className="text-sm text-white/25 mb-5">EZVIZ accountingizni ulang va kameralar avtomatik import qilinadi</p>
            <Link href="/cameras/connect" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6a1a] text-sm font-medium text-white hover:brightness-110 transition">
              EZVIZ ulash <ExternalLink size={13} />
            </Link>
          </div>
        )}

        {/* EZVIZ not configured warning */}
        {!loading && cameras.length > 0 && noEzviz && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">Faqat mock/RTSP kameralar bor. EZVIZ ulash uchun →
              <Link href="/cameras/connect" className="underline underline-offset-2 ml-1">Sozlash</Link>
            </p>
          </div>
        )}

        {/* Stats */}
        {cameras.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Jami", value: cameras.length, color: "#6b7280", icon: Camera },
              { label: "Online", value: online, color: "#22c55e", icon: Wifi },
              { label: "Offline", value: offline, color: "#ef4444", icon: WifiOff },
              { label: "Hodisalar", value: events.length, color: "#ff6a1a", icon: Activity },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-white/6 bg-white/2 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={13} style={{ color: s.color }} />
                  <span className="text-xs text-white/35">{s.label}</span>
                </div>
                <p className="text-2xl font-semibold text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        {cameras.length > 0 && (
          <div className="flex gap-1 w-fit rounded-xl border border-white/6 bg-white/2 p-1">
            {(["cameras", "events"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}
              >
                {t === "cameras" ? `Kameralar (${cameras.length})` : `Hodisalar (${events.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Camera grid */}
        {tab === "cameras" && cameras.length > 0 && (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="rounded-2xl border border-white/5 h-36 animate-pulse bg-white/2" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cameras.map(c => <CameraCard key={c.id} cam={c} onClick={() => setSelected(c)} />)}
            </div>
          )
        )}

        {/* Events list */}
        {tab === "events" && (
          <div className="rounded-2xl border border-white/6 overflow-hidden">
            {events.length === 0
              ? <div className="py-16 text-center text-white/25 text-sm">Hodisalar yo'q</div>
              : events.map(e => <EventRow key={e.id} evt={e} cameras={cameras} />)
            }
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && <CameraDetail cam={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

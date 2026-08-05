"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Smartphone, Wifi, WifiOff, Battery, MapPin, Phone,
  MessageSquare, Send, Trash2, Plus, RefreshCw, Zap,
  Volume2, MonitorSmartphone, Bell, Terminal,
} from "lucide-react";

// Orb loaded dynamically — Three.js must not run on SSR
const HermesOrb = dynamic(() => import("@/components/HermesOrb"), { ssr: false });

interface PhoneDevice {
  id: string;
  name: string;
  platform: "android" | "ios" | "other";
  webhook_url: string;
  status: "online" | "offline" | "unknown";
  battery?: number;
  location?: string;
  last_seen?: string;
  registered_at: string;
}

interface CommandResult {
  ok: boolean;
  device_id: string;
  cmd: { action: string; payload: Record<string, unknown> };
  result: { ok: boolean; status?: number; body?: string };
}

const COMMAND_TYPES = [
  { id: "call",     label: "Call",       icon: Phone,          fields: [{ key: "number", placeholder: "+998901234567" }] },
  { id: "sms",      label: "SMS",        icon: MessageSquare,  fields: [{ key: "number", placeholder: "+998901234567" }, { key: "message", placeholder: "Text..." }] },
  { id: "notify",   label: "Notify",     icon: Bell,           fields: [{ key: "title", placeholder: "Title" }, { key: "message", placeholder: "Body..." }] },
  { id: "open_app", label: "Open App",   icon: MonitorSmartphone, fields: [{ key: "package", placeholder: "com.example.app" }] },
  { id: "volume",   label: "Volume",     icon: Volume2,        fields: [{ key: "level", placeholder: "0-100" }] },
  { id: "custom",   label: "Custom",     icon: Terminal,       fields: [{ key: "data", placeholder: '{"key": "value"}' }] },
];

export default function PhonesPage() {
  const [devices, setDevices] = useState<PhoneDevice[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cmdType, setCmdType] = useState(COMMAND_TYPES[0]);
  const [cmdFields, setCmdFields] = useState<Record<string, string>>({});
  const [cmdResult, setCmdResult] = useState<CommandResult | null>(null);
  const [cmdSending, setCmdSending] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: "", platform: "android", webhook_url: "" });
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/phones");
      const data = await res.json() as { devices: PhoneDevice[] };
      setDevices(data.devices || []);
    } catch {
      addLog("❌ Qurilmalarni yuklashda xato");
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => { void fetchDevices(); }, [fetchDevices]);

  const registerDevice = async () => {
    if (!newDevice.name) return;
    try {
      const res = await fetch("/api/phones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDevice),
      });
      const data = await res.json() as { device: PhoneDevice };
      addLog(`✅ ${data.device.name} ro'yxatga olindi`);
      setShowAdd(false);
      setNewDevice({ name: "", platform: "android", webhook_url: "" });
      await fetchDevices();
    } catch {
      addLog("❌ Qurilma qo'shishda xato");
    }
  };

  const removeDevice = async (id: string, name: string) => {
    await fetch(`/api/phones?id=${id}`, { method: "DELETE" });
    addLog(`🗑 ${name} o'chirildi`);
    if (selected === id) setSelected(null);
    await fetchDevices();
  };

  const sendCommand = async () => {
    if (!selected) return;
    setCmdSending(true);
    setCmdResult(null);

    // Parse payload
    let payload: Record<string, unknown> = { ...cmdFields };
    if (cmdType.id === "custom") {
      try { payload = JSON.parse(cmdFields.data || "{}") as Record<string, unknown>; } catch { /**/ }
    }

    try {
      const res = await fetch("/api/phones?action=cmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: selected, action: cmdType.id, payload }),
      });
      const data = await res.json() as CommandResult;
      setCmdResult(data);
      addLog(`${data.ok ? "✅" : "❌"} ${cmdType.label} → ${devices.find(d => d.id === selected)?.name}`);
    } catch {
      addLog("❌ Buyruq yuborishda xato");
    } finally {
      setCmdSending(false);
    }
  };

  const selectedDevice = devices.find(d => d.id === selected);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0b", color: "#e4e4e7", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>

      {/* Left: Device list */}
      <div style={{ width: 260, borderRight: "1px solid #1f1f23", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #1f1f23", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Qurilmalar</div>
            <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>{devices.length} ta ulangan</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <IconBtn onClick={fetchDevices} title="Yangilash"><RefreshCw size={13} /></IconBtn>
            <IconBtn onClick={() => setShowAdd(true)} title="Qo'shish"><Plus size={13} /></IconBtn>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {loading && <div style={{ padding: 16, color: "#52525b", fontSize: 12, textAlign: "center" }}>Yuklanmoqda…</div>}
          {!loading && devices.length === 0 && (
            <div style={{ padding: 24, textAlign: "center" }}>
              <Smartphone size={28} style={{ color: "#27272a", margin: "0 auto 8px" }} />
              <div style={{ fontSize: 12, color: "#52525b" }}>Hech qanday qurilma yo'q</div>
              <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 4 }}>+ tugmasini bosing</div>
            </div>
          )}
          {devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              selected={selected === device.id}
              onSelect={() => setSelected(device.id)}
              onRemove={() => void removeDevice(device.id, device.name)}
            />
          ))}
        </div>

        {/* Add device form */}
        {showAdd && (
          <div style={{ borderTop: "1px solid #1f1f23", padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "#a1a1aa" }}>YANGI QURILMA</div>
            <input
              style={inputStyle}
              placeholder="Nomi (masalan: Asosiy telefon)"
              value={newDevice.name}
              onChange={e => setNewDevice(p => ({ ...p, name: e.target.value }))}
            />
            <select
              style={{ ...inputStyle, marginTop: 6 }}
              value={newDevice.platform}
              onChange={e => setNewDevice(p => ({ ...p, platform: e.target.value as "android" | "ios" | "other" }))}
            >
              <option value="android">Android</option>
              <option value="ios">iOS</option>
              <option value="other">Boshqa</option>
            </select>
            <input
              style={{ ...inputStyle, marginTop: 6 }}
              placeholder="Webhook URL (Tasker / HTTP Shortcuts)"
              value={newDevice.webhook_url}
              onChange={e => setNewDevice(p => ({ ...p, webhook_url: e.target.value }))}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => void registerDevice()} style={primaryBtnStyle}>Qo'shish</button>
              <button onClick={() => setShowAdd(false)} style={secondaryBtnStyle}>Bekor</button>
            </div>
          </div>
        )}
      </div>

      {/* Center: Orb + command panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Orb */}
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <HermesOrb showControls={true} />

          {/* Device status overlay */}
          {selectedDevice && (
            <div style={{
              position: "absolute", top: 16, left: 16,
              background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,106,26,0.2)",
              borderRadius: 6, padding: "8px 12px",
              fontFamily: "monospace", fontSize: 11, color: "rgba(255,180,80,0.9)",
              lineHeight: 1.7,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{selectedDevice.name}</div>
              <div>📱 {selectedDevice.platform.toUpperCase()}</div>
              {selectedDevice.battery !== undefined && <div>🔋 {selectedDevice.battery}%</div>}
              {selectedDevice.location && <div>📍 {selectedDevice.location}</div>}
              <div style={{ opacity: 0.6, fontSize: 10 }}>
                {selectedDevice.last_seen ? `Son: ${new Date(selectedDevice.last_seen).toLocaleTimeString()}` : ""}
              </div>
            </div>
          )}
        </div>

        {/* Command panel */}
        <div style={{ borderTop: "1px solid #1f1f23", padding: 16, background: "#0d0d0f" }}>
          {!selected ? (
            <div style={{ textAlign: "center", color: "#52525b", fontSize: 13, padding: "8px 0" }}>
              ← Qurilma tanlang, keyin buyruq yuboring
            </div>
          ) : (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              {/* Command type selector */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: "#71717a", marginBottom: 6, fontWeight: 600, letterSpacing: "0.05em" }}>BUYRUQ TURI</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {COMMAND_TYPES.map(ct => {
                    const Icon = ct.icon;
                    return (
                      <button
                        key={ct.id}
                        onClick={() => { setCmdType(ct); setCmdFields({}); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 4, padding: "5px 8px",
                          background: cmdType.id === ct.id ? "rgba(255,106,26,0.15)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${cmdType.id === ct.id ? "rgba(255,106,26,0.5)" : "#27272a"}`,
                          borderRadius: 4, color: cmdType.id === ct.id ? "#ff6a1a" : "#71717a",
                          fontSize: 11, cursor: "pointer",
                        }}
                      >
                        <Icon size={11} />{ct.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fields */}
              <div style={{ flex: 1, display: "flex", gap: 8 }}>
                {cmdType.fields.map(f => (
                  <div key={f.key} style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: "#71717a", marginBottom: 4, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{f.key}</div>
                    <input
                      style={inputStyle}
                      placeholder={f.placeholder}
                      value={cmdFields[f.key] || ""}
                      onChange={e => setCmdFields(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {/* Send */}
              <button
                onClick={() => void sendCommand()}
                disabled={cmdSending}
                style={{ ...primaryBtnStyle, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}
              >
                <Send size={13} />
                {cmdSending ? "Yuborilmoqda…" : "Yuborish"}
              </button>
            </div>
          )}

          {/* Command result */}
          {cmdResult && (
            <div style={{
              marginTop: 10, padding: "8px 12px", borderRadius: 4, fontSize: 11, fontFamily: "monospace",
              background: cmdResult.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${cmdResult.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              color: cmdResult.ok ? "#4ade80" : "#f87171",
            }}>
              {cmdResult.ok ? "✅" : "❌"} {cmdResult.result.body || (cmdResult.ok ? "Muvaffaqiyatli" : "Xato")}
            </div>
          )}
        </div>
      </div>

      {/* Right: Log */}
      <div style={{ width: 240, borderLeft: "1px solid #1f1f23", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #1f1f23" }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>Faoliyat</div>
        </div>
        <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: 10 }}>
          {log.length === 0 && <div style={{ color: "#3f3f46", fontSize: 11, textAlign: "center", padding: 16 }}>Faoliyat yo'q</div>}
          {log.map((entry, i) => (
            <div key={i} style={{ fontSize: 10, fontFamily: "monospace", color: "#71717a", lineHeight: 1.7, wordBreak: "break-word" }}>
              {entry}
            </div>
          ))}
        </div>

        {/* Webhook Setup guide */}
        <div style={{ borderTop: "1px solid #1f1f23", padding: 12 }}>
          <div style={{ fontSize: 10, color: "#52525b", lineHeight: 1.6 }}>
            <div style={{ fontWeight: 700, color: "#71717a", marginBottom: 6 }}>Telefon ulash:</div>
            <div>1. Android: <b>Tasker</b> yoki <b>HTTP Shortcuts</b></div>
            <div>2. iOS: <b>Shortcuts</b> app + webhook</div>
            <div style={{ marginTop: 6, fontFamily: "monospace", background: "#0a0a0b", padding: "4px 6px", borderRadius: 3, fontSize: 9, color: "#ff6a1a" }}>
              POST /api/phones<br />
              &#123; "name": "Mening tel", "webhook_url": "..." &#125;
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceCard({
  device, selected, onSelect, onRemove,
}: {
  device: PhoneDevice;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const isOnline = device.status === "online";
  return (
    <div
      onClick={onSelect}
      style={{
        padding: "10px 10px 10px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 4,
        background: selected ? "rgba(255,106,26,0.08)" : "transparent",
        border: `1px solid ${selected ? "rgba(255,106,26,0.3)" : "transparent"}`,
        display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Smartphone size={18} style={{ color: selected ? "#ff6a1a" : "#52525b" }} />
        <div style={{
          position: "absolute", bottom: -1, right: -2, width: 6, height: 6, borderRadius: "50%",
          background: isOnline ? "#22c55e" : "#52525b",
          border: "1.5px solid #0a0a0b",
        }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {device.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          {isOnline ? <Wifi size={9} style={{ color: "#22c55e" }} /> : <WifiOff size={9} style={{ color: "#52525b" }} />}
          <span style={{ fontSize: 10, color: "#52525b" }}>{device.platform}</span>
          {device.battery !== undefined && (
            <><Battery size={9} style={{ color: "#71717a" }} /><span style={{ fontSize: 10, color: "#52525b" }}>{device.battery}%</span></>
          )}
        </div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#3f3f46", padding: 4 }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid #27272a",
      borderRadius: 4, cursor: "pointer", color: "#71717a", padding: "5px 6px",
      display: "flex", alignItems: "center",
    }}>
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)", border: "1px solid #27272a",
  borderRadius: 4, padding: "7px 10px", fontSize: 12, color: "#e4e4e7",
  outline: "none", fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "#ff6a1a", border: "none", borderRadius: 4,
  color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
  padding: "7px 14px",
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: "1px solid #27272a",
  borderRadius: 4, color: "#71717a", fontSize: 12, cursor: "pointer",
  padding: "7px 12px",
};

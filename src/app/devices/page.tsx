"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Smartphone, Monitor, Wifi, WifiOff,
  Send, Trash2, Plus, RefreshCw, Terminal, Copy, Check,
  Volume2, MonitorSmartphone, Bell, MessageSquare, Phone,
  ChevronDown, ChevronUp, Download, QrCode, ShieldCheck,
  Camera, Mic, MapPin, Battery, Clipboard, Globe, Share2,
  RotateCcw, Cpu, Zap,
} from "lucide-react";

const HermesOrb = dynamic(() => import("@/components/HermesOrb"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────
interface PhoneDevice {
  id: string; name: string; platform: string;
  webhook_url: string; status: string;
  battery?: number; location?: string; last_seen?: string;
}
interface ComputerDevice {
  id: string; name: string; os: string; username: string;
  status: string; last_seen?: string; resolution?: string;
}
interface PairedDevice {
  id: string; name: string; platform: string; os_info: string; status: string;
  battery: number | null; storage_free: number | null; cpu_load: number | null; ram_used: number | null;
  location: string | null; last_seen: string | null; paired_at: string; revoked: boolean;
}
type DeviceTab = "computers" | "phones" | "paired";

const PAIRED_COMMANDS = [
  { id: "device_status", label: "Qurilma holati", icon: Cpu, fields: [] },
  { id: "battery_status", label: "Batareya", icon: Battery, fields: [] },
  { id: "get_location", label: "Joylashuv", icon: MapPin, fields: [] },
  { id: "take_screenshot", label: "Screenshot", icon: Monitor, fields: [] },
  { id: "send_notification", label: "Bildirishnoma", icon: Bell, fields: ["title", "message"] },
  { id: "vibrate", label: "Vibratsiya", icon: Smartphone, fields: ["duration"] },
  { id: "open_camera", label: "Kamera ochish", icon: Camera, fields: [] },
  { id: "get_files", label: "Fayllar ro'yxati", icon: Download, fields: ["path"] },
  { id: "download_file", label: "Fayl yuklab olish", icon: Download, fields: ["url", "path"] },
  { id: "terminal_command", label: "Terminal buyruq", icon: Terminal, fields: ["command"] },
];

const PHONE_COMMANDS = [
  // Aloqa
  { id: "call",          label: "Qo'ng'iroq",   icon: Phone,            fields: ["number"] },
  { id: "sms",           label: "SMS yuborish",  icon: MessageSquare,    fields: ["number", "message"] },
  { id: "sms_list",      label: "SMS listi",     icon: MessageSquare,    fields: [] },
  { id: "call_log",      label: "Qo'ng'iroq log",icon: Phone,            fields: [] },
  { id: "contacts",      label: "Kontaktlar",    icon: Smartphone,       fields: [] },
  // Bildirishnomalar
  { id: "notify",        label: "Bildirishnoma", icon: Bell,             fields: ["title", "message"] },
  { id: "notify_list",   label: "Bildiri listi", icon: Bell,             fields: [] },
  // Media
  { id: "photo",         label: "Foto olish",    icon: Camera,           fields: [] },
  { id: "screenshot",    label: "Screenshot",    icon: Monitor,          fields: [] },
  { id: "record_audio",  label: "Ovoz yozish",   icon: Mic,              fields: ["duration"] },
  { id: "play_sound",    label: "Musiqa ijro",   icon: Volume2,          fields: ["url"] },
  { id: "stop_sound",    label: "Musiqani to'x", icon: Volume2,          fields: [] },
  { id: "tts",           label: "TTS (ovoz)",    icon: Mic,              fields: ["text"] },
  // Joylashuv
  { id: "location",      label: "Joylashuv",     icon: MapPin,           fields: [] },
  // Qurilma
  { id: "battery",       label: "Batareya",      icon: Battery,          fields: [] },
  { id: "sensor",        label: "Sensorlar",     icon: Cpu,              fields: ["sensor"] },
  { id: "sysinfo",       label: "Tizim info",    icon: Cpu,              fields: [] },
  { id: "wifi",          label: "WiFi info",     icon: Wifi,             fields: [] },
  { id: "wifi_scan",     label: "WiFi tarmoqlar",icon: Wifi,             fields: [] },
  // Ovoz va ekran
  { id: "volume",        label: "Ovoz darajasi", icon: Volume2,          fields: ["level"] },
  { id: "torch",         label: "Fonar",         icon: Zap,              fields: ["on"] },
  { id: "vibrate",       label: "Vibratsiya",    icon: Smartphone,       fields: ["duration"] },
  { id: "screen_off",    label: "Ekran o'ch",    icon: Monitor,          fields: [] },
  { id: "screen_on",     label: "Ekran yoq",     icon: Monitor,          fields: [] },
  // Bufer
  { id: "clipboard_get", label: "Bufer olish",   icon: Clipboard,        fields: [] },
  { id: "clipboard_set", label: "Buferga yoz",   icon: Clipboard,        fields: ["text"] },
  // Dasturlar va brauzer
  { id: "open_url",      label: "URL ochish",    icon: Globe,            fields: ["url"] },
  { id: "open_app",      label: "Dastur ochish", icon: MonitorSmartphone,fields: ["package"] },
  { id: "share",         label: "Ulashish",      icon: Share2,           fields: ["text"] },
  // UI
  { id: "toast",         label: "Toast xabar",   icon: Bell,             fields: ["message"] },
  { id: "dialog",        label: "Dialog",        icon: Bell,             fields: ["title", "message"] },
  // Fayl
  { id: "download",      label: "Yuklab olish",  icon: Download,         fields: ["url"] },
  // Tizim
  { id: "shell",         label: "Shell buyruq",  icon: Terminal,         fields: ["command"] },
  { id: "reboot",        label: "Qayta ishga",   icon: RotateCcw,        fields: [] },
  // Boshqa
  { id: "custom",        label: "Boshqa (JSON)", icon: Terminal,         fields: ["data"] },
];

const COMPUTER_COMMANDS = [
  { id: "screenshot", label: "Screenshot",   icon: Monitor,        fields: [] },
  { id: "shell",      label: "Shell",        icon: Terminal,       fields: ["command"] },
  { id: "open",       label: "Ochish",       icon: MonitorSmartphone, fields: ["app"] },
  { id: "type",       label: "Yozish",       icon: MessageSquare,  fields: ["text"] },
  { id: "hotkey",     label: "Hotkey",       icon: Bell,           fields: ["keys"] },
  { id: "notify",     label: "Bildirishnoma",icon: Bell,           fields: ["title", "message"] },
  { id: "volume",     label: "Ovoz",         icon: Volume2,        fields: ["level"] },
  { id: "sysinfo",    label: "Tizim info",   icon: Monitor,        fields: [] },
  { id: "lock",       label: "Qulflash",     icon: Monitor,        fields: [] },
];

const INSTALL_URL = "/bridge/pari-bridge.py";

export default function DevicesPage() {
  const [tab, setTab] = useState<DeviceTab>("computers");
  const [phones, setPhones] = useState<PhoneDevice[]>([]);
  const [computers, setComputers] = useState<ComputerDevice[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [selectedPC, setSelectedPC] = useState<string | null>(null);
  const [cmdType, setCmdType] = useState(COMPUTER_COMMANDS[0]);
  const [phoneCmdType, setPhoneCmdType] = useState(PHONE_COMMANDS[0]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newPhone, setNewPhone] = useState({ name: "", platform: "android", webhook_url: "" });
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrPhone, setQrPhone] = useState<string | null>(null);
  const [newDeviceId] = useState(() => crypto.randomUUID());

  // Paired devices — the Jarvis Agent app pairs itself on first launch
  // (POST /api/devices/pair/auto with its built-in key); nothing to scan here.
  const [paired, setPaired] = useState<PairedDevice[]>([]);
  const [selectedPaired, setSelectedPaired] = useState<string | null>(null);
  const [pairedCmdType, setPairedCmdType] = useState(PAIRED_COMMANDS[0]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog(p => [`[${ts}] ${msg}`, ...p].slice(0, 80));
  }, []);

  const fetchAll = useCallback(async () => {
    const [pr, cr, dr] = await Promise.allSettled([
      fetch("/api/phones").then(r => r.json()) as Promise<{ devices: PhoneDevice[] }>,
      fetch("/api/computer?action=devices").then(r => r.json()) as Promise<{ computers: ComputerDevice[] }>,
      fetch("/api/devices").then(r => r.json()) as Promise<{ devices: PairedDevice[] }>,
    ]);
    if (pr.status === "fulfilled") setPhones(pr.value.devices || []);
    if (cr.status === "fulfilled") setComputers(cr.value.computers || []);
    if (dr.status === "fulfilled") setPaired(dr.value.devices || []);
  }, []);

  useEffect(() => { void fetchAll(); const t = setInterval(() => void fetchAll(), 5000); return () => clearInterval(t); }, [fetchAll]);

  const sendPairedCmd = async () => {
    if (!selectedPaired) return;
    setSending(true); setResult(null);
    try {
      const res = await fetch("/api/devices/command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: selectedPaired, action: pairedCmdType.id, payload: fields }),
      });
      const data = await res.json();
      setResult(data.ok ? "✅ Navbatga qo'yildi — qurilma keyingi pollingda oladi" : `❌ ${data.error}`);
      addLog(`${data.ok ? "✅" : "❌"} ${pairedCmdType.label} → ${paired.find(p => p.id === selectedPaired)?.name}`);
    } catch (e) {
      addLog(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSending(false); }
  };

  const revokePaired = async (id: string) => {
    await fetch("/api/devices/revoke", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_id: id }) });
    addLog("🔒 Qurilma sessiyasi bekor qilindi"); await fetchAll();
  };

  const removePaired = async (id: string) => {
    await fetch(`/api/devices?id=${id}`, { method: "DELETE" });
    addLog("🗑 Qurilma o'chirildi"); await fetchAll();
    if (selectedPaired === id) setSelectedPaired(null);
  };

  // Send computer command
  const sendComputerCmd = async () => {
    if (!selectedPC) return;
    setSending(true); setResult(null);

    let payload: Record<string, unknown> = { ...fields };
    // hotkey: parse comma-separated keys
    if (cmdType.id === "hotkey" && fields.keys) {
      payload.keys = fields.keys.split(",").map(k => k.trim());
    }

    try {
      const res = await fetch("/api/computer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: selectedPC, action: cmdType.id, payload }),
      });
      const data = await res.json() as { ok?: boolean; result?: unknown; status?: string; note?: string };
      const out = data.result ? JSON.stringify(data.result).slice(0, 300) : (data.note || (data.ok ? "✅ Bajarildi" : "❌ Xato"));
      setResult(out);
      addLog(`${data.ok !== false ? "✅" : "❌"} ${cmdType.label}: ${out.slice(0, 80)}`);

      // If screenshot command, load it
      if (cmdType.id === "screenshot" && data.ok) {
        const ss = await fetch(`/api/computer?action=screenshot&device_id=${selectedPC}`).then(r => r.json()) as { b64?: string };
        if (ss.b64) setScreenshot(`data:image/jpeg;base64,${ss.b64}`);
      }
    } catch (e) {
      addLog(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSending(false); }
  };

  // Send phone command
  const sendPhoneCmd = async () => {
    if (!selectedPhone) return;
    setSending(true); setResult(null);
    let payload: Record<string, unknown> = { ...fields };
    if (phoneCmdType.id === "custom") {
      try { payload = JSON.parse(fields.data || "{}") as Record<string, unknown>; } catch { /**/ }
    }
    try {
      const res = await fetch("/api/phones?action=cmd", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: selectedPhone, action: phoneCmdType.id, payload }),
      });
      const data = await res.json() as { ok?: boolean; result?: { ok?: boolean; body?: string } };
      const out = data.result?.body || (data.ok ? "✅ Bajarildi" : "❌ Xato");
      setResult(out);
      addLog(`${data.ok ? "✅" : "❌"} ${phoneCmdType.label} → ${phones.find(p => p.id === selectedPhone)?.name}`);
    } catch (e) {
      addLog(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSending(false); }
  };

  const addPhone = async () => {
    if (!newPhone.name) return;
    const payload = { ...newPhone, id: newDeviceId };
    await fetch("/api/phones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setShowAdd(false); setNewPhone({ name: "", platform: "android", webhook_url: "" });
    addLog(`✅ ${newPhone.name} qo'shildi`); await fetchAll();
  };

  // Auto-fill webhook URL when form opens
  const openAddForm = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setNewPhone(p => ({
      ...p,
      webhook_url: p.webhook_url || `${origin}/api/phones/webhook?device_id=${newDeviceId}`,
    }));
    setShowAdd(true);
  };

  const copyInstall = () => {
    const cmd = `pip install pyautogui pillow requests psutil\npython pari-bridge.py --url ${typeof window !== "undefined" ? window.location.origin : "https://your-app.railway.app"} --name "Mening PC"`;
    void navigator.clipboard.writeText(cmd);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const selectedPCObj = computers.find(c => c.id === selectedPC);
  const selectedPhoneObj = phones.find(p => p.id === selectedPhone);
  const selectedPairedObj = paired.find(p => p.id === selectedPaired);
  const activeComputer = tab === "computers" && selectedPC;
  const activePhone = tab === "phones" && selectedPhone;
  const activePaired = tab === "paired" && selectedPaired;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0a0b", color: "#e4e4e7", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>

      {/* ─── Left sidebar ─── */}
      <div style={{ width: 240, borderRight: "1px solid #1f1f23", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Tab switcher */}
        <div style={{ display: "flex", borderBottom: "1px solid #1f1f23" }}>
          {(["computers", "phones", "paired"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "12px 0", fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "#ff6a1a" : "transparent"}`,
              color: tab === t ? "#ff6a1a" : "#52525b", letterSpacing: "0.03em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
              {t === "computers" ? <Monitor size={12} /> : t === "phones" ? <Smartphone size={12} /> : <ShieldCheck size={12} />}
              {t === "computers" ? "PC / Mac" : t === "phones" ? "Telefon" : "Jarvis Agent"}
            </button>
          ))}
        </div>

        <div style={{ padding: "10px 12px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#52525b", fontWeight: 600, letterSpacing: "0.05em" }}>
            {tab === "computers" ? computers.length : tab === "phones" ? phones.length : paired.length} ta qurilma
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <Btn onClick={fetchAll}><RefreshCw size={11} /></Btn>
            {tab === "phones" && <Btn onClick={() => showAdd ? setShowAdd(false) : openAddForm()}><Plus size={11} /></Btn>}
          </div>
        </div>

        {/* Device list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
          {tab === "computers" && computers.map(dev => (
            <DevRow
              key={dev.id}
              icon={<Monitor size={16} />}
              name={dev.name}
              sub={`${dev.os} · ${dev.username}`}
              online={dev.status === "online"}
              selected={selectedPC === dev.id}
              onClick={() => setSelectedPC(dev.id)}
            />
          ))}
          {tab === "computers" && computers.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, color: "#3f3f46", fontSize: 11 }}>
              <Monitor size={24} style={{ margin: "0 auto 8px", color: "#27272a" }} />
              <div>pari-bridge.py ni</div>
              <div>kompyuteringizda ishga</div>
              <div>tushiring</div>
              <button onClick={() => setShowSetup(true)} style={{ ...linkBtn, marginTop: 8 }}>Qo'llanma →</button>
            </div>
          )}

          {tab === "phones" && phones.map(dev => (
            <DevRow
              key={dev.id}
              icon={<Smartphone size={16} />}
              name={dev.name}
              sub={dev.platform}
              online={dev.status === "online"}
              selected={selectedPhone === dev.id}
              onClick={() => setSelectedPhone(dev.id)}
              onQr={() => setQrPhone(qrPhone === dev.id ? null : dev.id)}
              onRemove={async () => {
                await fetch(`/api/phones?id=${dev.id}`, { method: "DELETE" });
                addLog(`🗑 ${dev.name} o'chirildi`); await fetchAll();
                if (selectedPhone === dev.id) setSelectedPhone(null);
              }}
            />
          ))}
          {tab === "phones" && phones.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, color: "#3f3f46", fontSize: 11 }}>
              <Smartphone size={24} style={{ margin: "0 auto 8px", color: "#27272a" }} />
              <div>Tasker yoki HTTP Shortcuts</div>
              <div>bilan telefon ulang</div>
            </div>
          )}

          {tab === "paired" && paired.map(dev => (
            <DevRow
              key={dev.id}
              icon={dev.platform === "android" || dev.platform === "ios" ? <Smartphone size={16} /> : <Monitor size={16} />}
              name={dev.name}
              sub={`${dev.platform}${dev.battery != null ? ` · 🔋${dev.battery}%` : ""}`}
              online={dev.status === "online"}
              selected={selectedPaired === dev.id}
              onClick={() => setSelectedPaired(dev.id)}
              onRemove={() => void removePaired(dev.id)}
            />
          ))}
          {tab === "paired" && paired.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, color: "#3f3f46", fontSize: 11, lineHeight: 1.6 }}>
              <Smartphone size={24} style={{ margin: "0 auto 8px", color: "#27272a" }} />
              <div style={{ color: "#52525b" }}>Hali qurilma yo&apos;q</div>
              <div style={{ marginTop: 6 }}>
                Jarvis Agent ilovasini o&apos;rnating — u birinchi ochilishda o&apos;zi ulanadi.
              </div>
            </div>
          )}
        </div>

        {/* Add phone form */}
        {tab === "phones" && showAdd && (
          <div style={{ borderTop: "1px solid #1f1f23", padding: 10 }}>
            <div style={{ fontSize: 10, color: "#71717a", fontWeight: 700, marginBottom: 6 }}>YANGI TELEFON</div>
            {[
              { placeholder: "Nomi (Asosiy tel)", key: "name" },
              { placeholder: "Webhook URL (Tasker)", key: "webhook_url" },
            ].map(f => (
              <input key={f.key} style={{ ...inp, marginBottom: 5 }} placeholder={f.placeholder}
                value={(newPhone as Record<string, string>)[f.key]}
                onChange={e => setNewPhone(p => ({ ...p, [f.key]: e.target.value }))} />
            ))}
            <select style={{ ...inp, marginBottom: 8 }} value={newPhone.platform}
              onChange={e => setNewPhone(p => ({ ...p, platform: e.target.value }))}>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </select>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => void addPhone()} style={primBtn}>Qo'shish</button>
              <button onClick={() => setShowAdd(false)} style={secBtn}>Bekor</button>
            </div>
          </div>
        )}

        {/* Bridge install guide */}
        <div style={{ borderTop: "1px solid #1f1f23", padding: 10 }}>
          <button onClick={() => setShowSetup(!showSetup)} style={{ ...secBtn, width: "100%", display: "flex", alignItems: "center", gap: 5, justifyContent: "center" }}>
            <Download size={11} /> Ko'prik o'rnatish
            {showSetup ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {showSetup && (
            <div style={{ marginTop: 8, fontSize: 10, color: "#71717a", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: "#a1a1aa", marginBottom: 4 }}>1. Yuklab oling:</div>
              <a href={INSTALL_URL} download style={{ color: "#ff6a1a", textDecoration: "none" }}>⬇ pari-bridge.py</a>
              <div style={{ fontWeight: 700, color: "#a1a1aa", marginTop: 6, marginBottom: 4 }}>2. O'rnating:</div>
              <div style={{ ...codeBox }}>pip install pyautogui pillow requests psutil</div>
              <div style={{ fontWeight: 700, color: "#a1a1aa", marginTop: 6, marginBottom: 4 }}>3. Ishga tushiring:</div>
              <div style={{ ...codeBox, fontSize: 9 }}>
                python pari-bridge.py<br />
                --url {typeof window !== "undefined" ? window.location.origin : "https://pari.app"}<br />
                --name "Mening PC"
              </div>
              <button onClick={copyInstall} style={{ ...secBtn, marginTop: 6, width: "100%", display: "flex", gap: 4, alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? "Nusxalandi!" : "Kodni nusxalash"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Center: Orb + command ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Orb */}
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <HermesOrb showControls />

          {/* Selected device overlay */}
          {(selectedPCObj || selectedPhoneObj || selectedPairedObj) && (
            <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,106,26,0.25)", borderRadius: 6, padding: "8px 14px", fontFamily: "monospace", fontSize: 11, color: "rgba(255,180,80,0.9)", lineHeight: 1.8, pointerEvents: "none" }}>
              {selectedPCObj && (
                <>
                  <div style={{ fontWeight: 700 }}>{selectedPCObj.name}</div>
                  <div>🖥 {selectedPCObj.os}</div>
                  <div>👤 {selectedPCObj.username}</div>
                  {selectedPCObj.resolution && <div>📐 {selectedPCObj.resolution}</div>}
                </>
              )}
              {selectedPhoneObj && (
                <>
                  <div style={{ fontWeight: 700 }}>{selectedPhoneObj.name}</div>
                  <div>📱 {selectedPhoneObj.platform}</div>
                  {selectedPhoneObj.battery !== undefined && <div>🔋 {selectedPhoneObj.battery}%</div>}
                </>
              )}
              {selectedPairedObj && (
                <>
                  <div style={{ fontWeight: 700 }}>{selectedPairedObj.name}</div>
                  <div>📱 {selectedPairedObj.platform}{selectedPairedObj.os_info && ` · ${selectedPairedObj.os_info}`}</div>
                  {selectedPairedObj.battery != null && <div>🔋 {selectedPairedObj.battery}%</div>}
                  {selectedPairedObj.location && <div>📍 {selectedPairedObj.location}</div>}
                  <div>{selectedPairedObj.revoked ? "🔒 Bekor qilingan" : selectedPairedObj.status === "online" ? "🟢 Online" : "⚪ Offline"}</div>
                </>
              )}
            </div>
          )}

          {/* Screenshot overlay */}
          {screenshot && tab === "computers" && (
            <div style={{ position: "absolute", bottom: 80, right: 16, width: 280, borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,106,26,0.3)", cursor: "pointer" }} onClick={() => setScreenshot(null)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshot} alt="screenshot" style={{ width: "100%", display: "block" }} />
              <div style={{ fontSize: 9, textAlign: "center", padding: "3px 0", background: "rgba(0,0,0,0.8)", color: "#52525b", fontFamily: "monospace" }}>klik → yopish</div>
            </div>
          )}
        </div>

        {/* Command panel */}
        <div style={{ borderTop: "1px solid #1f1f23", padding: 16, background: "#0d0d0f" }}>
          {!activeComputer && !activePhone && !activePaired ? (
            <div style={{ textAlign: "center", color: "#52525b", fontSize: 13 }}>← Qurilma tanlang</div>
          ) : (
            <>
              {activePaired && selectedPairedObj?.revoked && (
                <div style={{ marginBottom: 10, padding: "6px 10px", borderRadius: 4, fontSize: 11, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                  🔒 Bu qurilma sessiyasi bekor qilingan — buyruq yubora olmaysiz
                </div>
              )}

              {/* Command type pills */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                {(tab === "computers" ? COMPUTER_COMMANDS : tab === "phones" ? PHONE_COMMANDS : PAIRED_COMMANDS).map(ct => {
                  const Icon = ct.icon;
                  const isActive = tab === "computers" ? cmdType.id === ct.id : tab === "phones" ? phoneCmdType.id === ct.id : pairedCmdType.id === ct.id;
                  return (
                    <button key={ct.id} onClick={() => { setFields({}); setResult(null); if (tab === "computers") setCmdType(ct); else if (tab === "phones") setPhoneCmdType(ct); else setPairedCmdType(ct); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontWeight: 600, border: `1px solid ${isActive ? "rgba(255,106,26,0.5)" : "#27272a"}`, background: isActive ? "rgba(255,106,26,0.12)" : "rgba(255,255,255,0.03)", color: isActive ? "#ff8040" : "#52525b" }}>
                      <Icon size={10} />{ct.label}
                    </button>
                  );
                })}
              </div>

              {/* Fields + send */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1, display: "flex", gap: 6 }}>
                  {(tab === "computers" ? cmdType.fields : tab === "phones" ? phoneCmdType.fields : pairedCmdType.fields).map(f => (
                    <div key={f} style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: "#52525b", marginBottom: 4, fontWeight: 700, textTransform: "uppercase" }}>{f}</div>
                      <input style={inp} placeholder={f} value={fields[f] || ""} onChange={e => setFields(p => ({ ...p, [f]: e.target.value }))} />
                    </div>
                  ))}
                  {(tab === "computers" ? cmdType.fields : tab === "phones" ? phoneCmdType.fields : pairedCmdType.fields).length === 0 && (
                    <div style={{ color: "#3f3f46", fontSize: 12, display: "flex", alignItems: "center" }}>Parametr shart emas</div>
                  )}
                </div>
                <button
                  onClick={() => void (tab === "computers" ? sendComputerCmd() : tab === "phones" ? sendPhoneCmd() : sendPairedCmd())}
                  disabled={sending || Boolean(activePaired && selectedPairedObj?.revoked)}
                  style={{ ...primBtn, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, opacity: (activePaired && selectedPairedObj?.revoked) ? 0.4 : 1 }}
                >
                  <Send size={12} />{sending ? "Yuborilmoqda…" : "Yuborish"}
                </button>
                {activePaired && (
                  <button onClick={() => void revokePaired(selectedPaired!)} style={{ ...secBtn, flexShrink: 0 }}>Revoke</button>
                )}
              </div>

              {/* Result */}
              {result && (
                <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 4, fontSize: 11, fontFamily: "monospace", background: "rgba(255,255,255,0.04)", border: "1px solid #27272a", color: "#a1a1aa", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 100, overflowY: "auto" }}>
                  {result}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Right: Activity log ─── */}
      <div style={{ width: 220, borderLeft: "1px solid #1f1f23", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid #1f1f23", fontSize: 12, fontWeight: 600 }}>Faoliyat</div>
        <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
          {log.length === 0 && <div style={{ color: "#3f3f46", fontSize: 11, textAlign: "center", padding: 16 }}>—</div>}
          {log.map((entry, i) => (
            <div key={i} style={{ fontSize: 10, fontFamily: "monospace", color: "#52525b", lineHeight: 1.7, wordBreak: "break-word", marginBottom: 2 }}>{entry}</div>
          ))}
        </div>
        {/* Voice prompt hint */}
        <div style={{ borderTop: "1px solid #1f1f23", padding: 10 }}>
          <div style={{ fontSize: 10, color: "#3f3f46", lineHeight: 1.7 }}>
            <div style={{ color: "#52525b", fontWeight: 700, marginBottom: 4 }}>Ovoziy buyruqlar:</div>
            <div>"Chrome ni och"</div>
            <div>"Ekran nusxasini ol"</div>
            <div>"Javlon ga SMS yubor"</div>
            <div>"Ovozni 50 ga qo'y"</div>
            <div>"Ekranni qufla"</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function DevRow({ icon, name, sub, online, selected, onClick, onQr, onRemove }: {
  icon: React.ReactNode; name: string; sub: string;
  online: boolean; selected: boolean;
  onClick: () => void; onQr?: () => void; onRemove?: () => void;
}) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 8px", borderRadius: 5, cursor: "pointer", marginBottom: 2, background: selected ? "rgba(255,106,26,0.08)" : "transparent", border: `1px solid ${selected ? "rgba(255,106,26,0.25)" : "transparent"}`, transition: "all 0.12s" }}>
      <div style={{ position: "relative", flexShrink: 0, color: selected ? "#ff6a1a" : "#52525b" }}>
        {icon}
        <div style={{ position: "absolute", bottom: -1, right: -2, width: 6, height: 6, borderRadius: "50%", background: online ? "#22c55e" : "#3f3f46", border: "1.5px solid #0a0a0b" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 1 }}>
          {online ? <Wifi size={8} style={{ color: "#22c55e" }} /> : <WifiOff size={8} style={{ color: "#3f3f46" }} />}
          <span style={{ fontSize: 10, color: "#52525b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>
        </div>
      </div>
      {onQr && (
        <button onClick={e => { e.stopPropagation(); onQr(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#3f3f46", padding: 3 }}>
          <QrCode size={10} />
        </button>
      )}
      {onRemove && (
        <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#3f3f46", padding: 3 }}>
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}
function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #27272a", borderRadius: 4, cursor: "pointer", color: "#71717a", padding: "4px 6px", display: "flex", alignItems: "center" }}>{children}</button>;
}

const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid #27272a", borderRadius: 4, padding: "6px 10px", fontSize: 12, color: "#e4e4e7", outline: "none", fontFamily: "inherit" };
const primBtn: React.CSSProperties = { background: "#ff6a1a", border: "none", borderRadius: 4, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "7px 14px" };
const secBtn: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid #27272a", borderRadius: 4, color: "#71717a", fontSize: 11, cursor: "pointer", padding: "6px 10px" };
const codeBox: React.CSSProperties = { fontFamily: "monospace", background: "#0a0a0b", border: "1px solid #1f1f23", borderRadius: 3, padding: "5px 7px", fontSize: 9, color: "#ff6a1a", lineHeight: 1.7, wordBreak: "break-all" };
const linkBtn: React.CSSProperties = { background: "none", border: "none", color: "#ff6a1a", cursor: "pointer", fontSize: 10, padding: 0 };

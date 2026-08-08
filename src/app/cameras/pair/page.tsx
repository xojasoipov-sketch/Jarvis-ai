"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { QrCode, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Camera as CameraIcon, Wifi } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";

type PairingSession = {
  pairingId: string;
  token: string;
  pairingEndpoint: string;
  expiresAt: string;
};

type DiscoveryResult = {
  id: string;
  local_device_id: string;
  name: string;
  manufacturer: string;
  model: string;
  ip: string;
  protocols: { rtsp?: boolean; onvif?: boolean; ptz?: boolean; audio?: boolean; snapshot?: boolean };
};

type PairingStatus = {
  pairing: { id: string; status: string; expires_at: string };
  discovered: DiscoveryResult[];
};

// EZVIZ mobil ilovasidagi kabi: Scan QR → Discover → Connect — foydalanuvchi
// IP/RTSP/ONVIF profil bilan qiynalmaydi (36-band).
export default function CameraPairPage() {
  const [session, setSession] = useState<PairingSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PairingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DiscoveryResult | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmedName, setConfirmedName] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSession = useCallback(async () => {
    setError(null);
    setStatus(null);
    setSelected(null);
    setConfirmedName(null);
    try {
      const res = await fetch("/api/cameras/pairing/create", { method: "POST" });
      const data = await res.json() as { ok: boolean; error?: string } & Partial<PairingSession>;
      if (!data.ok || !data.pairingId) {
        setError(data.error || "Pairing session yaratilmadi");
        return;
      }
      const s: PairingSession = {
        pairingId: data.pairingId, token: data.token!,
        pairingEndpoint: data.pairingEndpoint!, expiresAt: data.expiresAt!,
      };
      setSession(s);
      const qrPayload = JSON.stringify({ pairingId: s.pairingId, token: s.token, pairingEndpoint: s.pairingEndpoint });
      const url = await QRCode.toDataURL(qrPayload, { width: 320, margin: 1, color: { dark: "#ffffff", light: "#00000000" } });
      setQrDataUrl(url);
    } catch {
      setError("Pairing session yaratib bo'lmadi. Qayta urinib ko'ring.");
    }
  }, []);

  useEffect(() => { void startSession(); }, [startSession]);

  // Pairing holatini poll qilish — gateway QR'ni skan qilib, kameralarni topguncha
  useEffect(() => {
    if (!session) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/cameras/pairing/${session.pairingId}/status`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean } & Partial<PairingStatus>;
      if (data.ok && data.pairing) {
        setStatus({ pairing: data.pairing, discovered: data.discovered || [] });
        if (data.pairing.status === "expired") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session]);

  const handleConfirm = async () => {
    if (!selected || !username.trim() || !password.trim()) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch("/api/cameras/pairing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discoveryResultId: selected.id, username: username.trim(), password: password.trim() }),
      });
      const data = await res.json() as { ok: boolean; error?: string; camera?: { name: string } };
      if (!data.ok) { setConfirmError(data.error || "Kamera qo'shilmadi"); return; }
      setConfirmedName(data.camera?.name || selected.name);
      setSelected(null);
    } finally {
      setConfirming(false);
    }
  };

  const pairingStatusLabel: Record<string, string> = {
    pending: "QR kutilmoqda...",
    claimed: "Gateway ulandi, qidirilmoqda...",
    cameras_found: "Kameralar topildi",
    completed: "Tugallandi",
    expired: "Muddati tugadi",
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8">

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#ff6a1a]/10 flex items-center justify-center">
            <QrCode size={22} className="text-[#ff6a1a]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Kamera qo'shish</h1>
            <p className="text-sm text-white/40">QR orqali local kamerani ulash</p>
          </div>
        </div>

        {confirmedName && (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 size={16} />
            <span>&quot;{confirmedName}&quot; ulandi.</span>
            <Link href="/cameras" className="ml-auto text-white/60 hover:text-white flex items-center gap-1">
              Kameralarga <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-2 text-sm text-red-400">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {!selected && session && (
          <div className="rounded-2xl border border-white/8 bg-white/2 p-6 space-y-5 text-center">
            <div>
              <h2 className="font-medium mb-1">1. Camera Gateway'da skan qiling</h2>
              <p className="text-sm text-white/40">
                Uy tarmog'ingizdagi Camera Gateway dasturini ishga tushiring va bu QR'ni bering.
              </p>
            </div>

            {qrDataUrl && (
              <div className="flex justify-center">
                <img src={qrDataUrl} alt="Pairing QR" className="rounded-xl bg-black p-3 border border-white/10" width={220} height={220} />
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-white/40">
              <Wifi size={12} className={status?.pairing.status === "pending" ? "animate-pulse" : "text-green-400"} />
              {status ? pairingStatusLabel[status.pairing.status] || status.pairing.status : "QR yaratilmoqda..."}
            </div>

            <button
              onClick={startSession}
              className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition"
            >
              <RefreshCw size={12} /> QR'ni yangilash (5 daqiqada tugaydi)
            </button>
          </div>
        )}

        {status && status.discovered.length > 0 && !selected && (
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5 space-y-3">
            <h2 className="text-sm font-medium text-white/70">Topilgan kameralar</h2>
            {status.discovered.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className="w-full flex items-center justify-between rounded-xl bg-white/3 border border-white/6 px-4 py-3 hover:bg-white/6 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <CameraIcon size={16} className="text-[#ff6a1a]" />
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-white/40">{d.manufacturer || "Noma'lum"} {d.model} · {d.ip}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 text-[10px] text-white/40">
                  {d.protocols.rtsp && <span className="px-1.5 py-0.5 rounded bg-white/5">RTSP</span>}
                  {d.protocols.onvif && <span className="px-1.5 py-0.5 rounded bg-white/5">ONVIF</span>}
                  {d.protocols.ptz && <span className="px-1.5 py-0.5 rounded bg-white/5">PTZ</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="rounded-2xl border border-white/8 bg-white/2 p-6 space-y-4">
            <h2 className="font-medium">2. {selected.name} — login</h2>
            <p className="text-xs text-white/40">
              Kamera username/parolini bir marta kiriting. Shifrlab saqlanadi, frontend/logga chiqmaydi.
            </p>
            <div className="space-y-3">
              <input
                type="text" placeholder="Username (masalan: admin)"
                value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder-white/20 focus:outline-none focus:border-white/30"
                autoComplete="off"
              />
              <input
                type="password" placeholder="Parol"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm placeholder-white/20 focus:outline-none focus:border-white/30"
                autoComplete="new-password"
              />
            </div>
            {confirmError && <p className="text-xs text-red-400">{confirmError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-white/10 py-3 text-sm text-white/60 hover:text-white transition">
                Orqaga
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming || !username.trim() || !password.trim()}
                className="flex-1 rounded-xl bg-[#ff6a1a] py-3 text-sm font-semibold hover:brightness-110 disabled:opacity-40 transition"
              >
                {confirming ? "Ulanmoqda..." : "Ulash"}
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link href="/cameras/connect" className="text-xs text-white/30 hover:text-white/60 underline underline-offset-2">
            Buning o'rniga EZVIZ Cloud orqali ulash
          </Link>
        </div>
      </div>
    </div>
  );
}

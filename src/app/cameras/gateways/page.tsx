"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldOff, Wifi, WifiOff, RefreshCw } from "lucide-react";
import Link from "next/link";

type Gateway = {
  id: string;
  name: string;
  status: string;
  last_seen: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
};

// Settings → Gateway → Security (13-band: "Revoke Device")
export default function GatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cameras/gateway");
      const data = await res.json() as { ok: boolean; gateways: Gateway[] };
      setGateways(data.gateways || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm("Bu gateway'ni bekor qilasizmi? U qayta pairing qilinmaguncha hech qanday so'rov qabul qilinmaydi.")) return;
    setRevoking(id);
    try {
      await fetch(`/api/cameras/gateway/${id}/revoke`, { method: "POST" });
      await load();
    } finally { setRevoking(null); }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white px-4 py-12">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ff6a1a]/10 flex items-center justify-center">
              <Shield size={20} className="text-[#ff6a1a]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Gateway xavfsizligi</h1>
              <p className="text-sm text-white/40">Ro'yxatdan o'tgan Camera Gateway'lar</p>
            </div>
          </div>
          <button onClick={() => void load()} disabled={loading} className="p-2 rounded-xl border border-white/8 text-white/40 hover:text-white transition disabled:opacity-30">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {!loading && gateways.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/30 text-sm">
            Hali gateway ro'yxatdan o'tmagan.{" "}
            <Link href="/cameras/pair" className="underline underline-offset-2 text-white/50">Kamera qo'shish</Link>
          </div>
        )}

        <div className="space-y-3">
          {gateways.map((g) => (
            <div key={g.id} className={`rounded-2xl border p-4 ${g.revoked_at ? "border-red-500/15 bg-red-500/5" : "border-white/8 bg-white/2"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {g.name}
                    {g.revoked_at ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 flex items-center gap-1"><ShieldOff size={10} /> Bekor qilingan</span>
                    ) : g.status === "online" ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 flex items-center gap-1"><Wifi size={10} /> Online</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-white/40 flex items-center gap-1"><WifiOff size={10} /> Offline</span>
                    )}
                  </p>
                  <p className="text-xs text-white/30 mt-1 font-mono">{g.id.slice(0, 16)}…</p>
                  <p className="text-xs text-white/25 mt-0.5">
                    {g.last_seen ? `Oxirgi ko'rilgan: ${new Date(g.last_seen).toLocaleString("uz-UZ")}` : "Hali onlayn bo'lmagan"}
                  </p>
                  {g.revoked_reason && <p className="text-xs text-red-400/70 mt-1">{g.revoked_reason}</p>}
                </div>
                {!g.revoked_at && (
                  <button
                    onClick={() => void handleRevoke(g.id)}
                    disabled={revoking === g.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition flex-shrink-0"
                  >
                    {revoking === g.id ? "..." : "Bekor qilish"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

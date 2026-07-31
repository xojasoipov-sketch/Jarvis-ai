"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, X, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";

type Notification = {
  id: number;
  title: string;
  body?: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
};

const TYPE_STYLES = {
  info:    { icon: Info,         color: "text-blue-500",   bg: "bg-blue-50"   },
  success: { icon: CheckCircle,  color: "text-green-500",  bg: "bg-green-50"  },
  warning: { icon: AlertTriangle,color: "text-amber-500",  bg: "bg-amber-50"  },
  error:   { icon: AlertCircle,  color: "text-red-500",    bg: "bg-red-50"    },
};

function relTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m}d oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s oldin`;
  return `${Math.floor(h / 24)}k oldin`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function load() {
    try {
      const r = await fetch("/api/notifications?all=1");
      const d = await r.json();
      setNotifications(d.notifications || []);
    } catch {}
  }

  async function markRead(id: number) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }

  async function markAllRead() {
    setLoading(true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    setLoading(false);
  }

  async function dismiss(id: number) {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--border)] transition-all"
      >
        <Bell size={15} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 bottom-10 w-80 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text)]">Bildirishnomalar</p>
            {unread > 0 && (
              <button onClick={markAllRead} disabled={loading}
                className="text-xs text-[var(--accent)] hover:opacity-70 flex items-center gap-1 transition-opacity">
                <CheckCheck size={12} /> Hammasini o'qi
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--muted)]">Bildirishnoma yo'q</div>
            ) : (
              notifications.map(n => {
                const S = TYPE_STYLES[n.type] || TYPE_STYLES.info;
                const Icon = S.icon;
                return (
                  <div key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 transition-colors ${n.read ? "opacity-60" : ""}`}>
                    <div className={`w-6 h-6 rounded-lg ${S.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={12} strokeWidth={1.75} className={S.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text)] leading-snug">{n.title}</p>
                      {n.body && <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-[var(--muted)] mt-1">{relTime(n.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} className="p-1 text-[var(--muted)] hover:text-green-500 transition-colors">
                          <Check size={11} strokeWidth={2} />
                        </button>
                      )}
                      <button onClick={() => dismiss(n.id)} className="p-1 text-[var(--muted)] hover:text-red-500 transition-colors">
                        <X size={11} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

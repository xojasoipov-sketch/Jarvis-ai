"use client";
import { useState, useEffect, useCallback } from "react";
import { GitBranch, GitPullRequest, GitMerge, ExternalLink, RefreshCw, Rocket, CheckCircle2, XCircle, Clock, Eye, EyeOff } from "lucide-react";

type Session = {
  id: number;
  title: string;
  branch: string;
  url: string;
  status: "open" | "merged" | "closed";
  createdAt: string;
  updatedAt: string;
};

function StatusBadge({ status }: { status: Session["status"] }) {
  if (status === "merged") {
    return (
      <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
        <GitMerge size={11} strokeWidth={2} /> Merge qilingan
      </span>
    );
  }
  if (status === "open") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
        <Clock size={11} strokeWidth={2} /> Kutilmoqda
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
      <XCircle size={11} strokeWidth={2} /> Yopilgan
    </span>
  );
}

// Renders a unified diff as colored HTML — green for additions, red for removals
function DiffView({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <div className="bg-gray-900 rounded-xl p-3 overflow-x-auto max-h-96 overflow-y-auto">
      <pre className="text-xs font-mono leading-relaxed">
        {lines.map((line, i) => {
          let cls = "text-gray-400";
          if (line.startsWith("+") && !line.startsWith("+++")) cls = "text-green-400 bg-green-950/40";
          else if (line.startsWith("-") && !line.startsWith("---")) cls = "text-red-400 bg-red-950/40";
          else if (line.startsWith("diff --git") || line.startsWith("index ")) cls = "text-indigo-300 font-semibold";
          else if (line.startsWith("@@")) cls = "text-purple-300";
          return (
            <div key={i} className={`px-2 ${cls}`}>
              {line || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [openDiff, setOpenDiff] = useState<number | null>(null);
  const [diffs, setDiffs] = useState<Record<number, string>>({});
  const [diffLoading, setDiffLoading] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions", { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      setConfigured(data.configured);
      setSessions(data.sessions || []);
      setError(data.error || "");
    } catch {
      setError("Yuklashda xato");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleDiff(id: number) {
    if (openDiff === id) { setOpenDiff(null); return; }
    setOpenDiff(id);
    if (diffs[id]) return;
    setDiffLoading(id);
    try {
      const res = await fetch(`/api/sessions?diff=${id}`);
      const data = await res.json();
      setDiffs((d) => ({ ...d, [id]: data.diff || data.error || "Diff topilmadi" }));
    } catch {
      setDiffs((d) => ({ ...d, [id]: "Diff yuklashda xato" }));
    }
    setDiffLoading(null);
  }

  async function doAction(action: "merge" | "redeploy", prNumber?: number) {
    setBusyId(prNumber ?? -1);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, prNumber }),
      });
      const data = await res.json();
      if (!res.ok) alert("Xato: " + (data.error || "Noma'lum"));
      else if (action === "merge") alert(data.deploy ? "Merge qilindi va deploy boshlandi ✅" : "Merge qilindi ✅ (deploy avtomatik boshlanmadi — VERCEL_TOKEN tekshiring)");
      else if (action === "redeploy") alert("Deploy boshlandi — 2-3 daqiqada tayyor bo'ladi");
      load();
    } catch {
      alert("So'rovda xato");
    }
    setBusyId(null);
  }

  return (
    <div className="fade-in max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pari AI o&apos;zi taklif qilgan kod o&apos;zgarishlari — har biri alohida GitHub Pull Request
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => doAction("redeploy")}
            disabled={busyId !== null}
            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-xl transition-all disabled:opacity-40"
          >
            <Rocket size={13} strokeWidth={1.75} /> Redeploy
          </button>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
          >
            <RefreshCw size={13} strokeWidth={2} className={loading ? "animate-spin" : ""} /> Yangilash
          </button>
        </div>
      </div>

      {configured === false && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
          <code className="bg-white px-1.5 py-0.5 rounded">GITHUB_TOKEN</code> sozlanmagan — sessiyalar ko&apos;rsatilmaydi.
          Connectors sahifasidan qo&apos;shing.
        </div>
      )}

      {error && configured !== false && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {configured && !error && sessions.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <GitBranch size={28} strokeWidth={1.5} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Hali sessiya yo&apos;q</p>
          <p className="text-xs text-gray-400 mt-1">
            Chat&apos;da &quot;kodni o&apos;zgartir&quot; deb so&apos;rasangiz, bu yerda yangi sessiya paydo bo&apos;ladi
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <GitPullRequest size={16} strokeWidth={1.75} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.title}</p>
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600 flex-shrink-0">
                      <ExternalLink size={12} strokeWidth={1.75} />
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{s.branch}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(s.updatedAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <StatusBadge status={s.status} />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleDiff(s.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-600 rounded-lg transition-all"
                  >
                    {openDiff === s.id ? <EyeOff size={12} strokeWidth={1.75} /> : <Eye size={12} strokeWidth={1.75} />}
                    {openDiff === s.id ? "Yashirish" : "O'zgarishni ko'rish"}
                  </button>
                  {s.status === "open" && (
                    <button
                      onClick={() => doAction("merge", s.id)}
                      disabled={busyId !== null}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg transition-all"
                    >
                      {busyId === s.id ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} strokeWidth={2} />
                      )}
                      Yoqdi, qil
                    </button>
                  )}
                </div>
              </div>
            </div>

            {openDiff === s.id && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                {diffLoading === s.id ? (
                  <p className="text-xs text-gray-400">Yuklanmoqda...</p>
                ) : (
                  <DiffView diff={diffs[s.id] || ""} />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

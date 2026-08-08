"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, Save, X, ExternalLink, Star, Eye, EyeOff, GripVertical, Loader2,
} from "lucide-react";

/* Bu sahifa /portfolio-admin manzilida — middleware'ning parol-gate'i ostida.
   (Ommaviy /portfolio sahifalari gate'dan chetlashtirilgan, bu esa emas.) */

const CATEGORIES = ["Web-saytlar", "Telegram Mini App", "AI", "Branding", "CRM"] as const;

const GRADIENTS = [
  { label: "Ko'k", value: "linear-gradient(150deg,#0b1220 0%,#12233d 55%,#0b1220 100%)" },
  { label: "Oltin", value: "linear-gradient(150deg,#1a1410 0%,#3a2410 55%,#1a1410 100%)" },
  { label: "Siyoh", value: "linear-gradient(150deg,#170f1e 0%,#2e1a3d 55%,#170f1e 100%)" },
  { label: "Yashil", value: "linear-gradient(150deg,#0a1512 0%,#123a2c 55%,#0a1512 100%)" },
  { label: "Grafit", value: "linear-gradient(150deg,#0d1117 0%,#1f2b3a 55%,#0d1117 100%)" },
];

type Metric = { value: string; label: string };

type Project = {
  id: string;
  slug: string;
  title: string;
  category: string;
  tagline: string;
  summary: string;
  gradient: string;
  tech: string[];
  link: string | null;
  metrics: Metric[];
  problem: string | null;
  solution: string | null;
  featured: boolean;
  published: boolean;
  sort_order: number;
};

/** Formadagi ko'rinish: input'lar null qabul qilmagani uchun matn maydonlari doim string. */
type Draft = Omit<Project, "id" | "tech" | "link" | "problem" | "solution"> & {
  id?: string;
  tech: string;
  link: string;
  problem: string;
  solution: string;
};

function emptyDraft(nextOrder: number): Draft {
  return {
    slug: "", title: "", category: "AI", tagline: "", summary: "",
    gradient: GRADIENTS[0].value, tech: "", link: "", metrics: [],
    problem: "", solution: "", featured: false, published: true, sort_order: nextOrder,
  };
}

function toDraft(p: Project): Draft {
  return { ...p, tech: p.tech.join(", "), link: p.link ?? "", problem: p.problem ?? "", solution: p.solution ?? "" };
}

export default function PortfolioAdminPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio/projects");
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      setError("Loyihalarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!draft) return;
    if (!draft.title.trim()) { setError("Nomi bo'sh bo'lmasligi kerak"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...draft, tech: draft.tech.split(",").map((t) => t.trim()).filter(Boolean) };
      const res = await fetch("/api/portfolio/projects", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Saqlanmadi");
      setDraft(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Project) {
    if (!confirm(`"${p.title}" o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.`)) return;
    try {
      const res = await fetch(`/api/portfolio/projects?id=${encodeURIComponent(p.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "O'chirilmadi");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Bitta bayroqni (featured/published) darhol o'zgartiradi. */
  async function toggle(p: Project, field: "featured" | "published") {
    try {
      await fetch("/api/portfolio/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, [field]: !p[field] }),
      });
      await load();
    } catch {
      setError("O'zgartirib bo'lmadi");
    }
  }

  const nextOrder = projects.length ? Math.max(...projects.map((p) => p.sort_order)) + 1 : 1;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portfolio loyihalari</h1>
            <p className="text-sm text-white/50 mt-1">
              Bu yerda qo{"'"}shilgan loyihalar darhol{" "}
              <a href="/portfolio/loyihalar" className="text-[#D6A86A] hover:underline">saytda</a> ko{"'"}rinadi.
            </p>
          </div>
          <button
            onClick={() => setDraft(emptyDraft(nextOrder))}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D6A86A] px-4 py-2.5 text-sm font-semibold text-[#140F07] hover:brightness-110 transition"
          >
            <Plus size={16} /> Yangi loyiha
          </button>
        </header>

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Yopish"><X size={16} /></button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-white/50 py-16 justify-center">
            <Loader2 size={18} className="animate-spin" /> Yuklanmoqda…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-16 text-center">
            <p className="text-white/60">Hali loyiha yo{"'"}q.</p>
            <button onClick={() => setDraft(emptyDraft(1))} className="mt-4 text-sm text-[#D6A86A] hover:underline">
              Birinchisini qo{"'"}shing
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition"
              >
                <GripVertical size={16} className="text-white/20 shrink-0" />
                <div
                  className="h-12 w-12 shrink-0 rounded-xl border border-white/10"
                  style={{ background: p.gradient }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{p.title}</span>
                    <span className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/50">
                      {p.category}
                    </span>
                    {!p.published && (
                      <span className="shrink-0 rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/40">
                        chop etilmagan
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[13px] text-white/45 mt-0.5">
                    {p.summary || p.tagline || "— tavsif yo'q"}
                  </p>
                  {p.link ? (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-[12px] text-[#D6A86A] hover:underline"
                    >
                      <ExternalLink size={11} /> {p.link.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="mt-1 block text-[12px] text-white/25">havola yo{"'"}q</span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggle(p, "featured")}
                    title={p.featured ? "Bosh sahifadan olib tashlash" : "Bosh sahifaga chiqarish"}
                    className="rounded-lg p-2 hover:bg-white/5 transition"
                  >
                    <Star size={16} className={p.featured ? "fill-[#D6A86A] text-[#D6A86A]" : "text-white/30"} />
                  </button>
                  <button
                    onClick={() => toggle(p, "published")}
                    title={p.published ? "Yashirish" : "Chop etish"}
                    className="rounded-lg p-2 hover:bg-white/5 transition"
                  >
                    {p.published
                      ? <Eye size={16} className="text-white/50" />
                      : <EyeOff size={16} className="text-white/25" />}
                  </button>
                  <button
                    onClick={() => setDraft(toDraft(p))}
                    className="rounded-lg px-3 py-2 text-[13px] text-white/70 hover:bg-white/5 transition"
                  >
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => remove(p)}
                    title="O'chirish"
                    className="rounded-lg p-2 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {draft && (
        <Editor
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => { setDraft(null); setError(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}

/* ── Tahrirlash oynasi ────────────────────────────────────────────────────── */

function Editor({
  draft, setDraft, onSave, onCancel, saving,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-[720px] rounded-2xl border border-white/10 bg-[#0D0D0D] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {draft.id ? "Loyihani tahrirlash" : "Yangi loyiha"}
          </h2>
          <button onClick={onCancel} className="rounded-lg p-2 text-white/40 hover:bg-white/5" aria-label="Yopish">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="Nomi" required>
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Masalan: Jarvis AI"
              className={inputClass}
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Turi">
              <select value={draft.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0D0D0D]">{c}</option>)}
              </select>
            </Field>
            <Field label="Qisqa yorliq" hint="kartada kichik matn">
              <input
                value={draft.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="AI yordamchi"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Tavsif" hint="1-2 gapda nima qilingani">
            <textarea
              value={draft.summary}
              onChange={(e) => set("summary", e.target.value)}
              rows={3}
              placeholder="Telegram ichida ishlaydigan e-commerce Mini App…"
              className={`${inputClass} resize-y`}
            />
          </Field>

          <Field label="Havola" hint="sayt yoki repo — bo'sh qoldirsa ko'rsatilmaydi">
            <input
              value={draft.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://github.com/…"
              className={inputClass}
            />
          </Field>

          <Field label="Texnologiyalar" hint="vergul bilan ajrating">
            <input
              value={draft.tech}
              onChange={(e) => set("tech", e.target.value)}
              placeholder="Next.js, Supabase, Telegram Mini Apps"
              className={inputClass}
            />
          </Field>

          <Field label="Karta rangi">
            <div className="flex flex-wrap gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => set("gradient", g.value)}
                  title={g.label}
                  className={`h-10 w-16 rounded-lg border-2 transition ${
                    draft.gradient === g.value ? "border-[#D6A86A]" : "border-white/10 hover:border-white/30"
                  }`}
                  style={{ background: g.value }}
                />
              ))}
            </div>
          </Field>

          <details className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <summary className="cursor-pointer text-sm text-white/60 select-none">
              Qo{"'"}shimcha (ixtiyoriy) — muammo, yechim, raqamlar
            </summary>
            <div className="mt-4 space-y-4">
              <Field label="Muammo" hint="mijozda qanday muammo bor edi">
                <textarea
                  value={draft.problem}
                  onChange={(e) => set("problem", e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </Field>
              <Field label="Yechim" hint="siz nima qildingiz">
                <textarea
                  value={draft.solution}
                  onChange={(e) => set("solution", e.target.value)}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </Field>
              <Field label="Raqamlar" hint="FAQAT haqiqatan o'lchangan natijalar — taxminiy raqam yozmang">
                <MetricEditor metrics={draft.metrics} onChange={(m) => set("metrics", m)} />
              </Field>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-5 pt-1">
            <Toggle checked={draft.featured} onChange={(v) => set("featured", v)} label="Bosh sahifada ko'rsatish" />
            <Toggle checked={draft.published} onChange={(v) => set("published", v)} label="Chop etilgan" />
            <label className="flex items-center gap-2 text-sm text-white/60">
              Tartib
              <input
                type="number"
                value={draft.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value))}
                className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center text-white"
              />
            </label>
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button onClick={onCancel} className="rounded-xl px-5 py-2.5 text-sm text-white/60 hover:bg-white/5 transition">
            Bekor qilish
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D6A86A] px-5 py-2.5 text-sm font-semibold text-[#140F07] hover:brightness-110 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white " +
  "placeholder:text-white/25 outline-none focus:border-[#D6A86A]/60 transition";

function Field({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-white/70">
        {label}
        {required && <span className="text-[#D6A86A]"> *</span>}
        {hint && <span className="ml-2 font-normal text-white/35">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#D6A86A]"
      />
      {label}
    </label>
  );
}

function MetricEditor({
  metrics, onChange,
}: { metrics: Metric[]; onChange: (m: Metric[]) => void }) {
  return (
    <div className="space-y-2">
      {metrics.map((m, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={m.value}
            onChange={(e) => onChange(metrics.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
            placeholder="45 kun"
            className={`${inputClass} w-28`}
          />
          <input
            value={m.label}
            onChange={(e) => onChange(metrics.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            placeholder="Loyiha muddati"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => onChange(metrics.filter((_, j) => j !== i))}
            className="rounded-lg p-2 text-white/30 hover:text-red-400"
            aria-label="O'chirish"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...metrics, { value: "", label: "" }])}
        className="text-[13px] text-[#D6A86A] hover:underline"
      >
        + Raqam qo{"'"}shish
      </button>
    </div>
  );
}

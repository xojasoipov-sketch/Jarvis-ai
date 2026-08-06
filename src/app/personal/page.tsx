"use client";
import { useState, useEffect, useCallback } from "react";
import { Brain, Bell, Flame, Plus, Trash2, Check, X, Calendar as CalendarIcon } from "lucide-react";

/* ── types ── */
type MemoryItem = { id: string; category: string; key: string; value: string; importance: number };
type Habit = { id: string; title: string; streak: number; checkins: { date: string; done: boolean }[] };
type Reminder = { id: string; title: string; note: string; category: string; due_at: string; repeat: string };

const TABS = [
  { id: "memory", label: "Xotira", icon: Brain },
  { id: "habits", label: "Odatlar", icon: Flame },
  { id: "reminders", label: "Eslatmalar", icon: Bell },
] as const;

export default function PersonalPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("memory");

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shaxsiy yordamchi</h1>
        <p className="text-sm text-gray-500 mt-0.5">Xotira, odatlar va eslatmalar — Pari AI seni eslab qoladi</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "memory" && <MemoryTab />}
      {tab === "habits" && <HabitsTab />}
      {tab === "reminders" && <RemindersTab />}
    </div>
  );
}

/* ═══════════════════════════ Xotira ═══════════════════════════ */
function MemoryTab() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ category: "fact", key: "", value: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/personal-memory");
    const d = await r.json();
    setItems(d.items || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.key.trim() || !form.value.trim()) return;
    const r = await fetch("/api/personal-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const { item } = await r.json();
      setItems((prev) => [item, ...prev.filter((i) => !(i.category === item.category && i.key === item.key))]);
    }
    setForm({ category: "fact", key: "", value: "" });
    setShowNew(false);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/personal-memory?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-3">
      {!showNew ? (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" /> Yangi fakt qo&apos;shish
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-3">
          <div className="flex gap-2">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
            >
              <option value="fact">Fakt</option>
              <option value="preference">Afzallik</option>
              <option value="goal">Maqsad</option>
              <option value="date">Muhim sana</option>
            </select>
            <input
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="Masalan: sevimli rang"
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <textarea
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            placeholder="Qiymat: masalan, ko'k"
            rows={2}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Bekor</button>
            <button onClick={add} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">Saqlash</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Hali xotirada hech narsa yo&apos;q</div>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-4 hover:border-gray-200 transition-all">
              <div>
                <span className="text-[11px] font-medium uppercase text-indigo-600 tracking-wide">{i.category}</span>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{i.key}</p>
                <p className="text-sm text-gray-500">{i.value}</p>
              </div>
              <button onClick={() => remove(i.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ Odatlar ═══════════════════════════ */
function HabitsTab() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/habits");
    const d = await r.json();
    setHabits(d.habits || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!title.trim()) return;
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    setShowNew(false);
    load();
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  async function toggleToday(habit: Habit) {
    const doneToday = habit.checkins.some((c) => c.date === todayStr && c.done);
    setHabits((prev) => prev.map((h) => h.id === habit.id ? { ...h, streak: doneToday ? h.streak - 1 : h.streak + 1 } : h));
    await fetch("/api/habits/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: habit.id, done: !doneToday }),
    });
    load();
  }

  async function remove(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-3">
      {!showNew ? (
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Yangi odat
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Suv ichish, Sport, O'qish..."
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button onClick={() => setShowNew(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Bekor</button>
          <button onClick={add} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">Qo&apos;shish</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Yuklanmoqda...</div>
      ) : habits.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Hali odat qo&apos;shilmagan</div>
      ) : (
        <div className="space-y-2">
          {habits.map((h) => {
            const doneToday = h.checkins.some((c) => c.date === todayStr && c.done);
            return (
              <div key={h.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-all">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleToday(h)}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${doneToday ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-indigo-400"}`}
                  >
                    {doneToday && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{h.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Flame className="w-3.5 h-3.5 text-orange-500" /> {h.streak} kunlik ketma-ketlik
                    </p>
                  </div>
                </div>
                <button onClick={() => remove(h.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ Eslatmalar ═══════════════════════════ */
const CATEGORY_LABELS: Record<string, string> = { general: "Umumiy", birthday: "Tug'ilgan kun", health: "Salomatlik", finance: "Moliya", travel: "Sayohat" };
const REPEAT_LABELS: Record<string, string> = { none: "Bir martalik", daily: "Har kuni", weekly: "Har hafta", monthly: "Har oy", yearly: "Har yili" };

function RemindersTab() {
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", note: "", category: "general", due_at: "", repeat: "none" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/reminders");
    const d = await r.json();
    setItems(d.items || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.title.trim() || !form.due_at) return;
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, due_at: new Date(form.due_at).toISOString() }),
    });
    setForm({ title: "", note: "", category: "general", due_at: "", repeat: "none" });
    setShowNew(false);
    load();
  }

  async function complete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/reminders?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-3">
      {!showNew ? (
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Yangi eslatma
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-3">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Nima haqida eslatish kerak?"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={form.due_at}
              onChange={(e) => setForm({ ...form, due_at: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
            />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <select value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none">
            {Object.entries(REPEAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Bekor</button>
            <button onClick={add} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">Saqlash</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Faol eslatma yo&apos;q</div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start justify-between gap-4 hover:border-gray-200 transition-all">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(r.due_at).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{CATEGORY_LABELS[r.category] || r.category}
                    {r.repeat !== "none" && ` · ${REPEAT_LABELS[r.repeat]}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => complete(r.id)} className="p-1.5 text-gray-300 hover:text-green-500 rounded-lg transition-all"><Check className="w-4 h-4" /></button>
                <button onClick={() => remove(r.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-all"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

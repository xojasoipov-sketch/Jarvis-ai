"use client";
import { useState, useEffect, useCallback } from "react";
import { Wallet, TrendingUp, TrendingDown, Target, Repeat, HandCoins, Plus, Trash2, Check } from "lucide-react";

type Tx = { id: string; type: "income" | "expense"; amount: number; category: string; note: string; date: string };
type BudgetStatus = { category: string; limit: number; spent: number };
type Goal = { id: string; title: string; target_amount: number; current_amount: number; deadline: string | null; done: boolean };
type Sub = { id: string; name: string; amount: number; cycle: "monthly" | "yearly"; next_charge: string };
type Debt = { id: string; title: string; amount: number; direction: "owe" | "owed"; due_date: string | null };
type Summary = { income: number; expense: number; net: number; monthlySubsCost: number; owedByMe: number; owedToMe: number };

const TABS = [
  { id: "overview", label: "Umumiy", icon: Wallet },
  { id: "transactions", label: "Kirim/chiqim", icon: TrendingUp },
  { id: "budgets", label: "Budjet", icon: TrendingDown },
  { id: "goals", label: "Maqsadlar", icon: Target },
  { id: "subs", label: "Obunalar", icon: Repeat },
  { id: "debts", label: "Qarzlar", icon: HandCoins },
] as const;

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

export default function FinancePage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Moliya</h1>
        <p className="text-sm text-gray-500 mt-0.5">Budjet, kirim/chiqim, maqsadlar, obunalar va qarzlar</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "transactions" && <TransactionsTab />}
      {tab === "budgets" && <BudgetsTab />}
      {tab === "goals" && <GoalsTab />}
      {tab === "subs" && <SubsTab />}
      {tab === "debts" && <DebtsTab />}
    </div>
  );
}

/* ═══════════════════════════ Umumiy ═══════════════════════════ */
function OverviewTab() {
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/finance/summary").then((r) => r.json()).then(setS);
  }, []);

  if (!s) return <div className="text-center py-12 text-gray-400 text-sm">Yuklanmoqda...</div>;

  const cards = [
    { label: "Bu oy kirim", value: s.income, color: "text-green-600" },
    { label: "Bu oy chiqim", value: s.expense, color: "text-red-600" },
    { label: "Sof balans", value: s.net, color: s.net >= 0 ? "text-green-600" : "text-red-600" },
    { label: "Oylik obunalar", value: s.monthlySubsCost, color: "text-indigo-600" },
    { label: "Mening qarzim", value: s.owedByMe, color: "text-orange-600" },
    { label: "Menga qarzdorlar", value: s.owedToMe, color: "text-blue-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500">{c.label}</p>
          <p className={`text-xl font-bold mt-1 ${c.color}`}>{fmt(c.value)}</p>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════ Kirim/chiqim ═══════════════════════════ */
function TransactionsTab() {
  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ type: "expense" as Tx["type"], amount: "", category: "", note: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/finance/transactions");
    const d = await r.json();
    setItems(d.items || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.amount) return;
    await fetch("/api/finance/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ type: "expense", amount: "", category: "", note: "" });
    setShowNew(false);
    load();
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/finance/transactions?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-3">
      {!showNew ? (
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Yangi yozuv
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-3">
          <div className="flex gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Tx["type"] })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none">
              <option value="expense">Chiqim</option>
              <option value="income">Kirim</option>
            </select>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Summa"
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategoriya (masalan: ovqat, transport)"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Izoh (ixtiyoriy)"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Bekor</button>
            <button onClick={add} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">Saqlash</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Yuklanmoqda...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Hali yozuv yo&apos;q</div>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === "income" ? "bg-green-50" : "bg-red-50"}`}>
                  {t.type === "income" ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.category}{t.note && ` · ${t.note}`}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(t.date).toLocaleDateString("uz-UZ")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                </span>
                <button onClick={() => remove(t.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ Budjet ═══════════════════════════ */
function BudgetsTab() {
  const [items, setItems] = useState<BudgetStatus[]>([]);
  const [form, setForm] = useState({ category: "", monthly_limit: "" });

  const load = useCallback(async () => {
    const r = await fetch("/api/finance/budgets");
    const d = await r.json();
    setItems(d.items || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.category || !form.monthly_limit) return;
    await fetch("/api/finance/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ category: "", monthly_limit: "" });
    load();
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-2">
        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategoriya"
          className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        <input type="number" value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })} placeholder="Oylik limit"
          className="w-36 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        <button onClick={add} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">Belgilash</button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Hali budjet belgilanmagan</div>
      ) : (
        <div className="space-y-2">
          {items.map((b) => {
            const pct = b.limit > 0 ? Math.min(100, (b.spent / b.limit) * 100) : 0;
            const over = b.spent > b.limit;
            return (
              <div key={b.category} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-gray-900">{b.category}</span>
                  <span className={over ? "text-red-600 font-medium" : "text-gray-500"}>{fmt(b.spent)} / {fmt(b.limit)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ Maqsadlar ═══════════════════════════ */
function GoalsTab() {
  const [items, setItems] = useState<Goal[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", target_amount: "", deadline: "" });

  const load = useCallback(async () => {
    const r = await fetch("/api/finance/goals");
    const d = await r.json();
    setItems(d.items || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.title || !form.target_amount) return;
    await fetch("/api/finance/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ title: "", target_amount: "", deadline: "" });
    setShowNew(false);
    load();
  }

  async function contribute(id: string) {
    const amount = prompt("Qancha qo'shmoqchisiz?");
    if (!amount || isNaN(Number(amount))) return;
    await fetch("/api/finance/goals/contribute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, amount: Number(amount) }) });
    load();
  }

  return (
    <div className="space-y-3">
      {!showNew ? (
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Yangi maqsad
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Maqsad nomi"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="Maqsad summasi"
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Bekor</button>
            <button onClick={add} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">Saqlash</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Hali maqsad qo&apos;shilmagan</div>
      ) : (
        <div className="space-y-2">
          {items.map((g) => {
            const pct = Math.min(100, (g.current_amount / g.target_amount) * 100);
            return (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{g.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fmt(g.current_amount)} / {fmt(g.target_amount)}{g.deadline && ` · ${new Date(g.deadline).toLocaleDateString("uz-UZ")}`}</p>
                  </div>
                  {!g.done && <button onClick={() => contribute(g.id)} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium rounded-lg transition-all">Qo&apos;shish</button>}
                  {g.done && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Check className="w-3.5 h-3.5" /> Erishildi</span>}
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ Obunalar ═══════════════════════════ */
function SubsTab() {
  const [items, setItems] = useState<Sub[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", cycle: "monthly" as Sub["cycle"], next_charge: "" });

  const load = useCallback(async () => {
    const r = await fetch("/api/finance/subscriptions");
    const d = await r.json();
    setItems(d.items || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.name || !form.amount || !form.next_charge) return;
    await fetch("/api/finance/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ name: "", amount: "", cycle: "monthly", next_charge: "" });
    setShowNew(false);
    load();
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/finance/subscriptions?id=${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-3">
      {!showNew ? (
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Yangi obuna
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Obuna nomi (Netflix, Spotify...)"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Summa"
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            <select value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value as Sub["cycle"] })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none">
              <option value="monthly">Oylik</option>
              <option value="yearly">Yillik</option>
            </select>
            <input type="date" value={form.next_charge} onChange={(e) => setForm({ ...form, next_charge: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Bekor</button>
            <button onClick={add} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">Saqlash</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Hali obuna qo&apos;shilmagan</div>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0"><Repeat className="w-4 h-4 text-indigo-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{fmt(s.amount)} / {s.cycle === "monthly" ? "oy" : "yil"} · keyingi: {new Date(s.next_charge).toLocaleDateString("uz-UZ")}</p>
                </div>
              </div>
              <button onClick={() => remove(s.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ Qarzlar ═══════════════════════════ */
function DebtsTab() {
  const [items, setItems] = useState<Debt[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", direction: "owe" as Debt["direction"], due_date: "" });

  const load = useCallback(async () => {
    const r = await fetch("/api/finance/debts");
    const d = await r.json();
    setItems(d.items || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!form.title || !form.amount) return;
    await fetch("/api/finance/debts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ title: "", amount: "", direction: "owe", due_date: "" });
    setShowNew(false);
    load();
  }

  async function settle(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch("/api/finance/debts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  }

  return (
    <div className="space-y-3">
      {!showNew ? (
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Yangi qarz
        </button>
      ) : (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-5 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Kimga/kimdan"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <div className="grid grid-cols-3 gap-2">
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Summa"
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" />
            <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as Debt["direction"] })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none">
              <option value="owe">Men qarzdorman</option>
              <option value="owed">Menga qarzdor</option>
            </select>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">Bekor</button>
            <button onClick={add} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-xl transition-all">Saqlash</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Faol qarz yo&apos;q</div>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4 hover:border-gray-200 transition-all">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${d.direction === "owe" ? "bg-orange-50" : "bg-blue-50"}`}>
                  <HandCoins className={`w-4 h-4 ${d.direction === "owe" ? "text-orange-600" : "text-blue-600"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{d.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {d.direction === "owe" ? "Men qarzdorman" : "Menga qarzdor"} · {fmt(d.amount)}
                    {d.due_date && ` · ${new Date(d.due_date).toLocaleDateString("uz-UZ")}`}
                  </p>
                </div>
              </div>
              <button onClick={() => settle(d.id)} className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 text-xs font-medium rounded-lg transition-all">To&apos;landi</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

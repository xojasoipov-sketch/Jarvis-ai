// Moliya — kirim/chiqim, budjet, moliyaviy maqsadlar, obunalar, qarzlar.
// Supabase + in-memory fallback (business-store.ts bilan bir xil pattern).
import { supabase, dbConfigured } from "./supabase";

export type TxType = "income" | "expense";
export type Transaction = { id: string; type: TxType; amount: number; category: string; note: string; date: string; created_at: string };
export type Budget = { id: string; category: string; monthly_limit: number };
export type Goal = { id: string; title: string; target_amount: number; current_amount: number; deadline: string | null; done: boolean };
export type Subscription = { id: string; name: string; amount: number; cycle: "monthly" | "yearly"; next_charge: string; active: boolean };
export type Debt = { id: string; title: string; amount: number; direction: "owe" | "owed"; due_date: string | null; paid: boolean };

const memTx: Transaction[] = [];
const memBudgets: Budget[] = [];
const memGoals: Goal[] = [];
const memSubs: Subscription[] = [];
const memDebts: Debt[] = [];

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

/* ── Transactions (kirim/chiqim) ── */
export async function listTransactions(opts?: { from?: string; type?: TxType }): Promise<Transaction[]> {
  if (dbConfigured && supabase) {
    let q = supabase.from("pari_finance_transactions").select("*").order("date", { ascending: false });
    if (opts?.from) q = q.gte("date", opts.from);
    if (opts?.type) q = q.eq("type", opts.type);
    const { data } = await q;
    return data || [];
  }
  let rows = [...memTx];
  if (opts?.from) rows = rows.filter((t) => t.date >= opts.from!);
  if (opts?.type) rows = rows.filter((t) => t.type === opts.type);
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addTransaction(input: { type: TxType; amount: number; category?: string; note?: string; date?: string }): Promise<Transaction> {
  const row: Transaction = {
    id: uid(), type: input.type, amount: input.amount, category: input.category || "general",
    note: input.note || "", date: input.date || new Date().toISOString().slice(0, 10), created_at: new Date().toISOString(),
  };
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_finance_transactions").insert(row).select().single();
    return data || row;
  }
  memTx.push(row);
  return row;
}

export async function deleteTransaction(id: string): Promise<void> {
  if (dbConfigured && supabase) { await supabase.from("pari_finance_transactions").delete().eq("id", id); return; }
  const i = memTx.findIndex((t) => t.id === id);
  if (i >= 0) memTx.splice(i, 1);
}

/* ── Budgets ── */
export async function listBudgets(): Promise<Budget[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_finance_budgets").select("*");
    return data || [];
  }
  return [...memBudgets];
}

export async function setBudget(category: string, monthly_limit: number): Promise<Budget> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_finance_budgets").upsert({ category, monthly_limit }, { onConflict: "category" }).select().single();
    return data;
  }
  const existing = memBudgets.find((b) => b.category === category);
  if (existing) { existing.monthly_limit = monthly_limit; return existing; }
  const row: Budget = { id: uid(), category, monthly_limit };
  memBudgets.push(row);
  return row;
}

/** Joriy oy uchun budjet vs sarflangan xarajat. */
export async function budgetStatus(): Promise<{ category: string; limit: number; spent: number }[]> {
  const budgets = await listBudgets();
  const txs = await listTransactions({ from: monthStart(), type: "expense" });
  return budgets.map((b) => ({
    category: b.category,
    limit: b.monthly_limit,
    spent: txs.filter((t) => t.category === b.category).reduce((s, t) => s + t.amount, 0),
  }));
}

/* ── Goals ── */
export async function listGoals(): Promise<Goal[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_finance_goals").select("*").order("created_at", { ascending: false });
    return data || [];
  }
  return [...memGoals];
}

export async function createGoal(input: { title: string; target_amount: number; deadline?: string }): Promise<Goal> {
  const row: Goal = { id: uid(), title: input.title, target_amount: input.target_amount, current_amount: 0, deadline: input.deadline || null, done: false };
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_finance_goals").insert(row).select().single();
    return data || row;
  }
  memGoals.push(row);
  return row;
}

export async function contributeToGoal(id: string, amount: number): Promise<Goal | null> {
  if (dbConfigured && supabase) {
    const { data: g } = await supabase.from("pari_finance_goals").select("*").eq("id", id).single();
    if (!g) return null;
    const newAmount = g.current_amount + amount;
    const { data } = await supabase.from("pari_finance_goals").update({ current_amount: newAmount, done: newAmount >= g.target_amount }).eq("id", id).select().single();
    return data;
  }
  const g = memGoals.find((x) => x.id === id);
  if (!g) return null;
  g.current_amount += amount;
  g.done = g.current_amount >= g.target_amount;
  return g;
}

/* ── Subscriptions ── */
export async function listSubscriptions(): Promise<Subscription[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_finance_subscriptions").select("*").eq("active", true).order("next_charge", { ascending: true });
    return data || [];
  }
  return memSubs.filter((s) => s.active);
}

export async function addSubscription(input: { name: string; amount: number; cycle: "monthly" | "yearly"; next_charge: string }): Promise<Subscription> {
  const row: Subscription = { id: uid(), active: true, ...input };
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_finance_subscriptions").insert(row).select().single();
    return data || row;
  }
  memSubs.push(row);
  return row;
}

export async function cancelSubscription(id: string): Promise<void> {
  if (dbConfigured && supabase) { await supabase.from("pari_finance_subscriptions").update({ active: false }).eq("id", id); return; }
  const s = memSubs.find((x) => x.id === id);
  if (s) s.active = false;
}

/* ── Debts ── */
export async function listDebts(): Promise<Debt[]> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_finance_debts").select("*").eq("paid", false).order("due_date", { ascending: true });
    return data || [];
  }
  return memDebts.filter((d) => !d.paid);
}

export async function addDebt(input: { title: string; amount: number; direction: "owe" | "owed"; due_date?: string }): Promise<Debt> {
  const row: Debt = { id: uid(), title: input.title, amount: input.amount, direction: input.direction, due_date: input.due_date || null, paid: false };
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_finance_debts").insert(row).select().single();
    return data || row;
  }
  memDebts.push(row);
  return row;
}

export async function settleDebt(id: string): Promise<void> {
  if (dbConfigured && supabase) { await supabase.from("pari_finance_debts").update({ paid: true }).eq("id", id); return; }
  const d = memDebts.find((x) => x.id === id);
  if (d) d.paid = true;
}

/** Umumiy moliyaviy holat xulosasi — dashboard/analytics uchun. */
export async function financeSummary() {
  const [txs, subs, debts] = await Promise.all([listTransactions({ from: monthStart() }), listSubscriptions(), listDebts()]);
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthlySubsCost = subs.reduce((s, x) => s + (x.cycle === "monthly" ? x.amount : x.amount / 12), 0);
  const owedByMe = debts.filter((d) => d.direction === "owe").reduce((s, d) => s + d.amount, 0);
  const owedToMe = debts.filter((d) => d.direction === "owed").reduce((s, d) => s + d.amount, 0);
  return { income, expense, net: income - expense, monthlySubsCost, owedByMe, owedToMe };
}

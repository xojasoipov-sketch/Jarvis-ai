import { NextRequest, NextResponse } from "next/server";
import { listTransactions, addTransaction, deleteTransaction, type TxType } from "@/lib/finance-store";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || undefined;
  const type = (searchParams.get("type") as TxType | null) || undefined;
  const items = await listTransactions({ from, type });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, amount, category, note, date } = body;
  if (!type || !amount) return NextResponse.json({ error: "type va amount kerak" }, { status: 400 });
  const item = await addTransaction({ type, amount: Number(amount), category, note, date });
  log("info", "finance", `${type === "income" ? "Kirim" : "Chiqim"}: ${amount} (${category || "general"})`);
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await deleteTransaction(id);
  return NextResponse.json({ ok: true });
}

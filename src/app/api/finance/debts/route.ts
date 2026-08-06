import { NextRequest, NextResponse } from "next/server";
import { listDebts, addDebt, settleDebt } from "@/lib/finance-store";

export async function GET() {
  const items = await listDebts();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const { title, amount, direction, due_date } = await req.json();
  if (!title || !amount || !direction) return NextResponse.json({ error: "title, amount, direction kerak" }, { status: 400 });
  const item = await addDebt({ title, amount: Number(amount), direction, due_date });
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await settleDebt(id);
  return NextResponse.json({ ok: true });
}

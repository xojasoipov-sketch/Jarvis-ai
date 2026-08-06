import { NextRequest, NextResponse } from "next/server";
import { listReminders, createReminder, completeReminder, deleteReminder } from "@/lib/reminders-store";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const includeDone = new URL(req.url).searchParams.get("all") === "1";
  const items = await listReminders({ includeDone });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, note, category, due_at, repeat } = body;
  if (!title || !due_at) return NextResponse.json({ error: "title va due_at kerak" }, { status: 400 });
  const item = await createReminder({ title, note, category, due_at, repeat });
  log("info", "reminders", `Yangi eslatma: ${title} (${due_at})`);
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  const item = await completeReminder(id);
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await deleteReminder(id);
  return NextResponse.json({ ok: true });
}

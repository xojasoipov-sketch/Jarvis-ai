import { NextRequest, NextResponse } from "next/server";
import { listHabits, createHabit, deleteHabit, habitStreak, listCheckins } from "@/lib/habits-store";
import { log } from "@/lib/logger";

export async function GET() {
  const habits = await listHabits();
  const withStreak = await Promise.all(
    habits.map(async (h) => ({
      ...h,
      streak: await habitStreak(h.id),
      checkins: await listCheckins(h.id, 14),
    }))
  );
  return NextResponse.json({ habits: withStreak });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, emoji, target_days } = body;
  if (!title) return NextResponse.json({ error: "title kerak" }, { status: 400 });
  const habit = await createHabit({ title, emoji, target_days });
  log("info", "habits", `Yangi odat qo'shildi: ${title}`);
  return NextResponse.json({ habit });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await deleteHabit(id);
  return NextResponse.json({ ok: true });
}

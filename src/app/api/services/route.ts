import { NextRequest, NextResponse } from "next/server";
import { listServices, createService, updateService, deleteService } from "@/lib/services-store";

// GET /api/services?active=1
export async function GET(req: NextRequest) {
  const activeOnly = new URL(req.url).searchParams.get("active") === "1";
  const services = await listServices(activeOnly);
  return NextResponse.json({ services });
}

// POST /api/services  { category, name, description, price, currency?, billing_cycle?, delivery_days?, features? }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, name, description, price } = body;
  if (!category || !name || !description || price === undefined) {
    return NextResponse.json({ error: "category, name, description, price kerak" }, { status: 400 });
  }
  const service = await createService({
    category,
    name,
    description,
    price: Number(price),
    currency: body.currency || "UZS",
    billing_cycle: body.billing_cycle || "one_time",
    delivery_days: body.delivery_days ?? 3,
    features: body.features || [],
    active: body.active ?? true,
  });
  return NextResponse.json({ service });
}

// PATCH /api/services  { id, ...patch }
export async function PATCH(req: NextRequest) {
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await updateService(Number(id), patch);
  return NextResponse.json({ ok: true });
}

// DELETE /api/services?id=...
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await deleteService(Number(id));
  return NextResponse.json({ ok: true });
}

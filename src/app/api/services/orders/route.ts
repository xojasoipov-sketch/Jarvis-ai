import { NextRequest, NextResponse } from "next/server";
import { listOrders, createOrder, updateOrder, deleteOrder, getService, type OrderStatus } from "@/lib/services-store";
import { supabase, dbConfigured } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const status = new URL(req.url).searchParams.get("status") as OrderStatus | null;
  const orders = await listOrders(status || undefined);
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { service_id, client_name, client_contact, notes } = body;
  if (!client_name) {
    return NextResponse.json({ error: "client_name kerak" }, { status: 400 });
  }

  let price: number | undefined;
  let serviceName = "";
  if (service_id) {
    const service = await getService(Number(service_id));
    if (service) { price = service.price; serviceName = service.name; }
  }

  const order = await createOrder({
    service_id: service_id ? Number(service_id) : null,
    client_name,
    client_contact,
    status: "new",
    price: body.price ?? price,
    notes,
  });

  if (dbConfigured) {
    void supabase!.from("pari_notifications").insert({
      title: "🛒 Yangi xizmat buyurtmasi",
      body: `${client_name}${serviceName ? ` — ${serviceName}` : ""}`,
      type: "info",
    });
  }

  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest) {
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await updateOrder(Number(id), patch);

  if (patch.status === "paid" && dbConfigured) {
    void supabase!.from("pari_notifications").insert({
      title: "💰 To'lov qabul qilindi",
      body: `Buyurtma #${id} to'landi deb belgilandi`,
      type: "success",
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });
  await deleteOrder(Number(id));
  return NextResponse.json({ ok: true });
}

// Sotiladigan xizmatlar katalogi va buyurtmalar (Supabase-backed + in-memory fallback)
import { supabase, dbConfigured } from "./supabase";

export type ServiceCategory = "smm" | "content" | "dev" | "design" | "consulting" | "automation" | "general";
export type BillingCycle = "one_time" | "monthly" | "weekly";
export type OrderStatus = "new" | "in_progress" | "delivered" | "paid" | "cancelled";

export type Service = {
  id: number;
  category: ServiceCategory;
  name: string;
  description: string;
  price: number;
  price_display?: string;
  price_negotiable?: boolean;
  currency: string;
  billing_cycle: BillingCycle;
  delivery_days: number;
  features: string[];
  active: boolean;
  is_trending?: boolean;
  demand_score?: number;
  sort_order?: number;
  created_at: string;
};

export type ServiceOrder = {
  id: number;
  service_id: number | null;
  client_name: string;
  client_contact?: string;
  status: OrderStatus;
  price?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
};

const memServices: Service[] = [];
const memOrders: ServiceOrder[] = [];
let nextServiceId = 1;
let nextOrderId = 1;

// ──────────────────────────────────────────────
// Services
// ──────────────────────────────────────────────
export async function listServices(activeOnly = false): Promise<Service[]> {
  if (dbConfigured && supabase) {
    let q = supabase.from("pari_services").select("*").order("sort_order", { ascending: true }).order("created_at");
    if (activeOnly) q = q.eq("active", true);
    const { data } = await q;
    return data || [];
  }
  const services = activeOnly ? memServices.filter((s) => s.active) : [...memServices];
  return services;
}

export async function getService(id: number): Promise<Service | null> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_services").select("*").eq("id", id).single();
    return data || null;
  }
  return memServices.find((s) => s.id === id) || null;
}

export async function createService(s: Omit<Service, "id" | "created_at">): Promise<Service> {
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_services").insert(s).select().single();
    return data;
  }
  const row: Service = { ...s, id: nextServiceId++, created_at: new Date().toISOString() };
  memServices.unshift(row);
  return row;
}

export async function updateService(id: number, patch: Partial<Service>): Promise<void> {
  if (dbConfigured && supabase) {
    await supabase.from("pari_services").update(patch).eq("id", id);
    return;
  }
  const i = memServices.findIndex((s) => s.id === id);
  if (i !== -1) Object.assign(memServices[i], patch);
}

export async function deleteService(id: number): Promise<void> {
  if (dbConfigured && supabase) {
    await supabase.from("pari_services").delete().eq("id", id);
    return;
  }
  const i = memServices.findIndex((s) => s.id === id);
  if (i !== -1) memServices.splice(i, 1);
}

// ──────────────────────────────────────────────
// Orders
// ──────────────────────────────────────────────
export async function listOrders(status?: OrderStatus): Promise<ServiceOrder[]> {
  if (dbConfigured && supabase) {
    let q = supabase.from("pari_service_orders").select("*").order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    const { data } = await q;
    return data || [];
  }
  const orders = status ? memOrders.filter((o) => o.status === status) : [...memOrders];
  return orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createOrder(o: Omit<ServiceOrder, "id" | "created_at" | "updated_at">): Promise<ServiceOrder> {
  const now = new Date().toISOString();
  if (dbConfigured && supabase) {
    const { data } = await supabase.from("pari_service_orders").insert({ ...o, updated_at: now }).select().single();
    return data;
  }
  const row: ServiceOrder = { ...o, id: nextOrderId++, created_at: now, updated_at: now };
  memOrders.unshift(row);
  return row;
}

export async function updateOrder(id: number, patch: Partial<ServiceOrder>): Promise<void> {
  const payload = { ...patch, updated_at: new Date().toISOString() };
  if (dbConfigured && supabase) {
    await supabase.from("pari_service_orders").update(payload).eq("id", id);
    return;
  }
  const i = memOrders.findIndex((o) => o.id === id);
  if (i !== -1) Object.assign(memOrders[i], payload);
}

export async function deleteOrder(id: number): Promise<void> {
  if (dbConfigured && supabase) {
    await supabase.from("pari_service_orders").delete().eq("id", id);
    return;
  }
  const i = memOrders.findIndex((o) => o.id === id);
  if (i !== -1) memOrders.splice(i, 1);
}

export async function getOrderStats() {
  const orders = await listOrders();
  const paidOrders = orders.filter((o) => o.status === "paid");
  return {
    total: orders.length,
    new: orders.filter((o) => o.status === "new").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    paid: paidOrders.length,
    revenue: paidOrders.reduce((sum, o) => sum + (o.price || 0), 0),
  };
}

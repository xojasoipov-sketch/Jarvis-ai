import { NextRequest, NextResponse } from "next/server";
import { listModules, updateModule, MODULE_DEFS, type ModuleKey } from "@/lib/business-store";

// GET /api/business — list all 5 business modules with current status
export async function GET() {
  const modules = await listModules();
  const enriched = modules.map((m) => ({ ...m, ...MODULE_DEFS[m.module_key] }));
  return NextResponse.json({ modules: enriched });
}

// PATCH /api/business  { module_key, status?, revenue?, notes? }
export async function PATCH(req: NextRequest) {
  const { module_key, status, revenue, notes } = await req.json();
  if (!module_key || !(module_key in MODULE_DEFS)) {
    return NextResponse.json({ error: "module_key noto'g'ri" }, { status: 400 });
  }
  await updateModule(module_key as ModuleKey, { status, revenue, notes });
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { supabase, dbConfigured } from "@/lib/supabase";

// Runs a real, read-only SQL query against Supabase Postgres via a Postgres
// function the user creates once (documented on the Databases page and below).
// We never execute arbitrary SQL directly through the JS client — only SELECTs,
// and only through this explicit RPC so a leaked query can't mutate data.
//
//   create or replace function pari_run_readonly_query(query_text text)
//   returns setof json language plpgsql security definer as $$
//   begin
//     if query_text !~* '^\s*select' then
//       raise exception 'Faqat SELECT so''rovlariga ruxsat berilgan';
//     end if;
//     return query execute format('select row_to_json(t) from (%s) t', query_text);
//   end;
//   $$;

export async function POST(req: NextRequest) {
  if (!dbConfigured) return NextResponse.json({ error: "Supabase sozlanmagan" }, { status: 503 });
  const { query } = await req.json();
  if (!query || typeof query !== "string") return NextResponse.json({ error: "query kerak" }, { status: 400 });
  if (!/^\s*select/i.test(query)) {
    return NextResponse.json({ error: "Faqat SELECT so'rovlariga ruxsat berilgan" }, { status: 400 });
  }

  const start = Date.now();
  const { data, error } = await supabase!.rpc("pari_run_readonly_query", { query_text: query });
  if (error) {
    const hint = error.message.includes("does not exist")
      ? "pari_run_readonly_query funksiyasi hali yaratilmagan — Databases sahifasidagi SQL ko'rsatmasini bajaring"
      : error.message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }
  return NextResponse.json({ rows: data, rowCount: (data || []).length, duration: `${Date.now() - start}ms` });
}

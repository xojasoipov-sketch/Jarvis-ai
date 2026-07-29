import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  try {
    // DuckDuckGo instant answer API (bepul, key shart emas)
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    );
    const ddg = await ddgRes.json();

    // Pollinations search (bepul)
    const polRes = await fetch(
      `https://text.pollinations.ai/search?q=${encodeURIComponent(query)}&count=5`,
      { headers: { "Content-Type": "application/json" } }
    ).catch(() => null);

    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // DDG related topics
    if (ddg.RelatedTopics?.length) {
      for (const t of ddg.RelatedTopics.slice(0, 5)) {
        if (t.Text && t.FirstURL) {
          results.push({ title: t.Text.split(" - ")[0] || t.Text.slice(0, 60), url: t.FirstURL, snippet: t.Text });
        }
      }
    }

    // DDG abstract
    if (ddg.AbstractText) {
      results.unshift({ title: ddg.Heading || query, url: ddg.AbstractURL || "", snippet: ddg.AbstractText });
    }

    if (polRes?.ok) {
      try {
        const polData = await polRes.json();
        if (Array.isArray(polData)) {
          for (const r of polData.slice(0, 3)) {
            results.push({ title: r.title || "", url: r.url || "", snippet: r.snippet || r.body || "" });
          }
        }
      } catch {}
    }

    return NextResponse.json({ results: results.slice(0, 6), query });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

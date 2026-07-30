import { NextRequest, NextResponse } from "next/server";

// In-memory store as fallback when Obsidian isn't connected
const LOCAL_MEMORY: { id: string; title: string; content: string; tags: string[]; ts: number }[] = [
  { id: "1", title: "Pari AI Arxitektura", content: "Ko'p agentli tizim: CEO, Researcher, Coder, Analyst, Writer, Marketing, DevOps, Assistant agentlari parallel ishlaydi. Railway deploy, Next.js 16, Tailwind CSS v3.", tags: ["arxitektura", "ai", "agents"], ts: Date.now() - 86400000 },
  { id: "2", title: "Bepul AI Provayderlar", content: "OpenRouter (Gemini 2.0 Flash) → Mistral Large → Groq LLaMA 3.3 70B → Cerebras LLaMA 3.3 70B. Fallback chain: birinchisi ishlamasa keyingisi.", tags: ["ai", "providers", "free"], ts: Date.now() - 172800000 },
];

const OBSIDIAN_URL = process.env.OBSIDIAN_URL || "";
const OBSIDIAN_KEY = process.env.OBSIDIAN_API_KEY || "";

async function obsidianGet(path: string) {
  if (!OBSIDIAN_URL) return null;
  const res = await fetch(`${OBSIDIAN_URL}/vault${path}`, {
    headers: { Authorization: `Bearer ${OBSIDIAN_KEY}` },
  }).catch(() => null);
  if (!res?.ok) return null;
  return res.json().catch(() => null);
}

async function obsidianSearch(query: string) {
  if (!OBSIDIAN_URL) return null;
  const res = await fetch(`${OBSIDIAN_URL}/search/simple/?query=${encodeURIComponent(query)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${OBSIDIAN_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }).catch(() => null);
  if (!res?.ok) return null;
  return res.json().catch(() => null);
}

// GET /api/memory — list or search
// ?q=query → search; ?id=id → get one; default → list all
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const id = searchParams.get("id");

  const obsidianConnected = !!OBSIDIAN_URL;

  // Search
  if (q) {
    const obsidianResults = await obsidianSearch(q);
    if (obsidianResults) {
      return NextResponse.json({ source: "obsidian", results: obsidianResults, query: q });
    }
    const local = LOCAL_MEMORY.filter(m =>
      m.title.toLowerCase().includes(q.toLowerCase()) ||
      m.content.toLowerCase().includes(q.toLowerCase()) ||
      m.tags.some(t => t.includes(q.toLowerCase()))
    );
    return NextResponse.json({ source: "local", results: local, query: q });
  }

  // Single item
  if (id) {
    const item = LOCAL_MEMORY.find(m => m.id === id);
    return NextResponse.json(item || { error: "not found" }, { status: item ? 200 : 404 });
  }

  // List all
  const obsidianFiles = await obsidianGet("/");
  if (obsidianFiles) {
    return NextResponse.json({ source: "obsidian", connected: true, files: obsidianFiles, local: LOCAL_MEMORY });
  }

  return NextResponse.json({ source: "local", connected: obsidianConnected, items: LOCAL_MEMORY });
}

// POST /api/memory — save a memory
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, content, tags = [] } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "title and content required" }, { status: 400 });
  }

  // Try to save to Obsidian
  if (OBSIDIAN_URL) {
    const path = `/vault/${title.replace(/[^a-zA-Z0-9Ѐ-ӿ\s-]/g, "")}.md`;
    const note = `# ${title}\n\nTags: ${tags.join(", ")}\n\n${content}`;
    const res = await fetch(`${OBSIDIAN_URL}${path}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${OBSIDIAN_KEY}`, "Content-Type": "text/markdown" },
      body: note,
    }).catch(() => null);
    if (res?.ok) {
      return NextResponse.json({ saved: true, source: "obsidian", path });
    }
  }

  // Save to local memory
  const item = { id: String(Date.now()), title, content, tags, ts: Date.now() };
  LOCAL_MEMORY.unshift(item);
  return NextResponse.json({ saved: true, source: "local", item });
}

// DELETE /api/memory?id=xxx
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const idx = LOCAL_MEMORY.findIndex(m => m.id === id);
  if (idx !== -1) LOCAL_MEMORY.splice(idx, 1);
  return NextResponse.json({ deleted: true });
}

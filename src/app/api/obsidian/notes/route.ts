/**
 * /api/obsidian/notes — Frontmatter-aware note CRUD
 *
 * GET  /api/obsidian/notes            — list recent notes with metadata
 * GET  /api/obsidian/notes?path=...   — read one note (parsed frontmatter)
 * POST /api/obsidian/notes            — create note { path, title, content, tags, folder }
 * PUT  /api/obsidian/notes            — update note { path, content, tags? }
 *
 * Supports both backends:
 *  - Obsidian Local REST API (OBSIDIAN_URL + OBSIDIAN_API_KEY) — local use
 *  - GitHub vault (GITHUB_TOKEN) — cloud use on Railway
 */
import { NextRequest, NextResponse } from "next/server";
import { vaultConfigured, listVault, readVaultFile, writeVaultFile } from "@/lib/githubVault";

const LOCAL_BASE = (process.env.OBSIDIAN_URL || "").replace(/\/$/, "");
const LOCAL_KEY = process.env.OBSIDIAN_API_KEY || process.env.OBSIDIAN_KEY || "";

function localHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  if (LOCAL_KEY) h["Authorization"] = `Bearer ${LOCAL_KEY}`;
  return h;
}

// ── Frontmatter helpers ──────────────────────────────────────────────────────

function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  if (!raw.startsWith("---")) return { frontmatter: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: {}, body: raw };
  const yamlBlock = raw.slice(4, end).trim();
  const body = raw.slice(end + 4).trim();
  const frontmatter: Record<string, unknown> = {};
  for (const line of yamlBlock.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      frontmatter[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      frontmatter[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }
  return { frontmatter, body };
}

function buildFrontmatter(meta: Record<string, unknown>, body: string): string {
  const lines: string[] = ["---"];
  for (const [k, v] of Object.entries(meta)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((s) => `"${s}"`).join(", ")}]`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push("---");
  lines.push("");
  lines.push(body);
  return lines.join("\n");
}

function notePath(folder: string, title: string): string {
  const safe = title.replace(/[/\\:*?"<>|]/g, "-").trim();
  const dir = folder.replace(/^\/|\/$/g, "");
  return dir ? `${dir}/${safe}.md` : `${safe}.md`;
}

// ── Local REST API helpers ───────────────────────────────────────────────────

async function localListRecent(): Promise<{ path: string; mtime: number; title: string; tags: string[] }[]> {
  const res = await fetch(`${LOCAL_BASE}/vault/`, {
    headers: localHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  const files: string[] = Array.isArray(data) ? data : (data.files || []);
  return files
    .filter((f: string) => f.endsWith(".md"))
    .slice(0, 50)
    .map((f: string) => ({
      path: f,
      mtime: 0,
      title: f.split("/").pop()?.replace(".md", "") || f,
      tags: [],
    }));
}

async function localReadNote(path: string): Promise<string | null> {
  const res = await fetch(`${LOCAL_BASE}/vault/${encodeURIComponent(path)}`, {
    headers: localHeaders({ Accept: "text/markdown" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return res.text();
}

async function localWriteNote(path: string, content: string): Promise<boolean> {
  const res = await fetch(`${LOCAL_BASE}/vault/${encodeURIComponent(path)}`, {
    method: "PUT",
    headers: localHeaders({ "Content-Type": "text/markdown" }),
    body: content,
    signal: AbortSignal.timeout(8000),
  });
  return res.ok;
}

// ── Route handlers ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  if (LOCAL_BASE) {
    if (path) {
      const raw = await localReadNote(path);
      if (!raw) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
      const { frontmatter, body } = parseFrontmatter(raw);
      return NextResponse.json({ path, frontmatter, body, raw, backend: "local" });
    }
    const notes = await localListRecent();
    return NextResponse.json({ notes, backend: "local", configured: true });
  }

  if (!vaultConfigured) {
    return NextResponse.json({ error: "Vault sozlanmagan", configured: false }, { status: 503 });
  }

  if (path) {
    const raw = await readVaultFile(path);
    if (!raw) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    const { frontmatter, body } = parseFrontmatter(raw);
    return NextResponse.json({ path, frontmatter, body, raw, backend: "github" });
  }

  // List recent notes from vault root
  try {
    const entries = await listVault("");
    const notes = entries
      .filter((e) => e.type === "file" && e.path.endsWith(".md"))
      .map((e) => ({
        path: e.path,
        title: e.name.replace(".md", ""),
        tags: [] as string[],
        mtime: 0,
      }));
    return NextResponse.json({ notes, backend: "github", configured: true });
  } catch {
    return NextResponse.json({ notes: [], backend: "github", configured: true });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const title = String(body.title || "Yangi Note");
  const content = String(body.content || "");
  const folder = String(body.folder || "");
  const tags: string[] = Array.isArray(body.tags) ? body.tags : [];
  const extraMeta: Record<string, unknown> = body.meta || {};

  const noteMeta: Record<string, unknown> = {
    title,
    date: new Date().toISOString().split("T")[0],
    tags,
    ...extraMeta,
  };

  const full = buildFrontmatter(noteMeta, content);
  const path = body.path || notePath(folder, title);

  if (LOCAL_BASE) {
    const ok = await localWriteNote(path, full);
    if (!ok) return NextResponse.json({ error: "Yozilmadi" }, { status: 500 });
    return NextResponse.json({ ok: true, path, backend: "local" });
  }

  if (!vaultConfigured) {
    return NextResponse.json({ error: "Vault sozlanmagan", configured: false }, { status: 503 });
  }

  const ok = await writeVaultFile(path, full, `note: ${title}`);
  if (!ok) return NextResponse.json({ error: "Yozilmadi" }, { status: 500 });
  return NextResponse.json({ ok: true, path, backend: "github" });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const path = String(body.path || "");
  if (!path) return NextResponse.json({ error: "path kerak" }, { status: 400 });

  const newContent = String(body.content || "");
  const newTags: string[] | undefined = Array.isArray(body.tags) ? body.tags : undefined;

  // Read existing, merge
  let existing = "";
  if (LOCAL_BASE) {
    existing = (await localReadNote(path)) || "";
  } else if (vaultConfigured) {
    existing = (await readVaultFile(path)) || "";
  }

  let full: string;
  if (existing) {
    const { frontmatter, body: oldBody } = parseFrontmatter(existing);
    const updatedMeta: Record<string, unknown> = {
      ...frontmatter,
      updated: new Date().toISOString().split("T")[0],
    };
    if (newTags) updatedMeta.tags = newTags;
    full = buildFrontmatter(updatedMeta, newContent || oldBody);
  } else {
    full = newContent;
  }

  if (LOCAL_BASE) {
    const ok = await localWriteNote(path, full);
    return NextResponse.json({ ok, path, backend: "local" });
  }

  if (!vaultConfigured) {
    return NextResponse.json({ error: "Vault sozlanmagan", configured: false }, { status: 503 });
  }

  const ok = await writeVaultFile(path, full, `update: ${path}`);
  return NextResponse.json({ ok, path, backend: "github" });
}

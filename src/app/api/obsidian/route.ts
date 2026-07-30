import { NextRequest, NextResponse } from "next/server";
import { vaultConfigured, listVault, readVaultFile, writeVaultFile, deleteVaultFile, searchVault } from "@/lib/githubVault";

const LOCAL_BASE = (process.env.OBSIDIAN_URL || "").replace(/\/$/, "");
const LOCAL_KEY = process.env.OBSIDIAN_API_KEY || process.env.OBSIDIAN_KEY || "";

function localHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  if (LOCAL_KEY) h["Authorization"] = `Bearer ${LOCAL_KEY}`;
  return h;
}

const configured = Boolean(LOCAL_BASE) || vaultConfigured;

// GET /api/obsidian             — list vault root
// GET /api/obsidian?path=dir/  — list directory
// GET /api/obsidian?file=note.md — read file content
// GET /api/obsidian?search=q   — search vault
export async function GET(req: NextRequest) {
  if (!configured) return NextResponse.json({ error: "Vault sozlanmagan (GITHUB_TOKEN kerak)", configured: false });

  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");
  const search = searchParams.get("search");
  const path = searchParams.get("path") || "/";

  try {
    if (LOCAL_BASE) {
      if (file) {
        const res = await fetch(`${LOCAL_BASE}/vault/${encodeURIComponent(file)}`, {
          headers: localHeaders({ Accept: "text/markdown" }),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return NextResponse.json({ error: res.statusText }, { status: res.status });
        return NextResponse.json({ content: await res.text(), file, configured: true, backend: "local" });
      }
      if (search) {
        const res = await fetch(
          `${LOCAL_BASE}/search/simple/?query=${encodeURIComponent(search)}&contextLength=300`,
          { headers: localHeaders(), signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) return NextResponse.json({ results: [], configured: true, backend: "local" });
        return NextResponse.json({ results: await res.json(), configured: true, backend: "local" });
      }
      const url = path === "/" ? `${LOCAL_BASE}/vault/` : `${LOCAL_BASE}/vault/${path.replace(/^\//, "")}`;
      const res = await fetch(url, { headers: localHeaders(), signal: AbortSignal.timeout(8000) });
      if (!res.ok) return NextResponse.json({ error: res.statusText, files: [], configured: true, backend: "local" }, { status: res.status });
      const data = await res.json();
      const files = Array.isArray(data) ? data : (data.files || data.vaultFiles || []);
      return NextResponse.json({ files, configured: true, backend: "local" });
    }

    // GitHub-backed vault (default, cloud-only, no local server needed)
    if (file) {
      const content = await readVaultFile(file);
      return NextResponse.json({ content, file, configured: true, backend: "github" });
    }
    if (search) {
      const results = await searchVault(search);
      return NextResponse.json({ results, configured: true, backend: "github" });
    }
    const entries = await listVault(path === "/" ? "" : path);
    const files = entries.map((e) => ({ path: e.path, type: e.type }));
    return NextResponse.json({ files, configured: true, backend: "github" });
  } catch (err) {
    return NextResponse.json({ error: `Vault ulanmadi: ${(err as Error).message}`, configured: true }, { status: 503 });
  }
}

// POST /api/obsidian — write note  { path, content }
export async function POST(req: NextRequest) {
  if (!configured) return NextResponse.json({ error: "Vault sozlanmagan" }, { status: 503 });
  const { path, content } = await req.json();
  if (!path || content === undefined) return NextResponse.json({ error: "path va content kerak" }, { status: 400 });
  try {
    if (LOCAL_BASE) {
      const res = await fetch(`${LOCAL_BASE}/vault/${encodeURIComponent(path)}`, {
        method: "PUT",
        headers: localHeaders({ "Content-Type": "text/markdown" }),
        body: content,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return NextResponse.json({ error: res.statusText }, { status: res.status });
      return NextResponse.json({ ok: true, path, backend: "local" });
    }
    await writeVaultFile(path, content);
    return NextResponse.json({ ok: true, path, backend: "github" });
  } catch (err) {
    return NextResponse.json({ error: `Vault ulanmadi: ${(err as Error).message}` }, { status: 503 });
  }
}

// DELETE /api/obsidian?file=note.md
export async function DELETE(req: NextRequest) {
  if (!configured) return NextResponse.json({ error: "Vault sozlanmagan" }, { status: 503 });
  const file = new URL(req.url).searchParams.get("file");
  if (!file) return NextResponse.json({ error: "file kerak" }, { status: 400 });
  try {
    if (LOCAL_BASE) {
      const res = await fetch(`${LOCAL_BASE}/vault/${encodeURIComponent(file)}`, {
        method: "DELETE",
        headers: localHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return NextResponse.json({ ok: res.ok, backend: "local" });
    }
    await deleteVaultFile(file);
    return NextResponse.json({ ok: true, backend: "github" });
  } catch (err) {
    return NextResponse.json({ error: `Vault ulanmadi: ${(err as Error).message}` }, { status: 503 });
  }
}

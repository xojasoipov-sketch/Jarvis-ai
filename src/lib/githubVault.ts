// GitHub-backed Obsidian vault — real cloud storage, no local server required.
// Notes live at GITHUB_VAULT_REPO (default: same repo) under GITHUB_VAULT_PATH (default: "vault").

const TOKEN =
  process.env.GITHUB_TOKEN ||
  process.env.GITHUB_PERSONAL_ACCESS_TOKEN ||
  process.env.GH_TOKEN ||
  "";
const REPO = process.env.GITHUB_VAULT_REPO || process.env.GITHUB_REPOSITORY || "";
const BRANCH = process.env.GITHUB_VAULT_BRANCH || "main";
const ROOT = (process.env.GITHUB_VAULT_PATH || "vault").replace(/^\/|\/$/g, "");

export const vaultConfigured = Boolean(TOKEN && REPO);

function api(path: string) {
  return `https://api.github.com/repos/${REPO}/${path}`;
}

function headers(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

function fullPath(notePath: string) {
  const clean = notePath.replace(/^\/+/, "");
  return `${ROOT}/${clean}`;
}

export type VaultFile = { path: string; type: "file" | "dir" };

export async function listVault(dir = ""): Promise<VaultFile[]> {
  const target = dir ? fullPath(dir) : ROOT;
  const res = await fetch(api(`contents/${encodeURI(target)}?ref=${BRANCH}`), {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : [data];
  return items.map((i: { path: string; type: string }) => ({
    path: i.path.slice(ROOT.length + 1),
    type: i.type === "dir" ? "dir" : "file",
  }));
}

export async function readVaultFile(notePath: string): Promise<string> {
  const res = await fetch(api(`contents/${encodeURI(fullPath(notePath))}?ref=${BRANCH}`), {
    headers: headers({ Accept: "application/vnd.github.raw+json" }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.text();
}

async function getSha(notePath: string): Promise<string | undefined> {
  const res = await fetch(api(`contents/${encodeURI(fullPath(notePath))}?ref=${BRANCH}`), {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return undefined;
  const data = await res.json();
  return data.sha;
}

export async function writeVaultFile(notePath: string, content: string): Promise<void> {
  const sha = await getSha(notePath);
  const res = await fetch(api(`contents/${encodeURI(fullPath(notePath))}`), {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      message: `pari-ai: update ${notePath}`,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
}

export async function deleteVaultFile(notePath: string): Promise<void> {
  const sha = await getSha(notePath);
  if (!sha) throw new Error("Fayl topilmadi");
  const res = await fetch(api(`contents/${encodeURI(fullPath(notePath))}`), {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ message: `pari-ai: delete ${notePath}`, sha, branch: BRANCH }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
}

export async function walkVault(dir = ""): Promise<VaultFile[]> {
  const entries = await listVault(dir);
  const files: VaultFile[] = [];
  for (const e of entries) {
    if (e.type === "dir") files.push(...(await walkVault(e.path)));
    else files.push(e);
  }
  return files;
}

export async function searchVault(query: string): Promise<{ path: string; matches: string[] }[]> {
  const files = (await walkVault("")).filter((f) => f.path.endsWith(".md"));
  const q = query.toLowerCase();
  const results: { path: string; matches: string[] }[] = [];
  for (const f of files) {
    try {
      const content = await readVaultFile(f.path);
      if (content.toLowerCase().includes(q)) {
        const lines = content.split("\n").filter((l) => l.toLowerCase().includes(q));
        results.push({ path: f.path, matches: lines.slice(0, 3) });
      }
    } catch {
      // skip unreadable file
    }
  }
  return results;
}

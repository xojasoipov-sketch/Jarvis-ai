import { ENV } from "@/lib/env";

const TOKEN = ENV.github();
const REPO = process.env.GITHUB_VAULT_REPO || process.env.GITHUB_REPOSITORY || "xojasoipov-sketch/Jarvis-ai";
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

export async function listVault(subPath = ""): Promise<{ name: string; path: string; type: "file" | "dir" }[]> {
  const dir = subPath ? `${ROOT}/${subPath}` : ROOT;
  const res = await fetch(api(`contents/${dir}?ref=${BRANCH}`), {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((item: { name: string; path: string; type: string }) => ({
    name: item.name,
    path: item.path,
    type: item.type === "dir" ? "dir" : "file",
  }));
}

export async function readVaultFile(filePath: string): Promise<string | null> {
  const res = await fetch(api(`contents/${filePath}?ref=${BRANCH}`), {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.content) return null;
  return Buffer.from(data.content, "base64").toString("utf-8");
}

export async function writeVaultFile(
  filePath: string,
  content: string,
  message = "chore: update vault"
): Promise<boolean> {
  let sha: string | undefined;
  const check = await fetch(api(`contents/${filePath}?ref=${BRANCH}`), {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
  if (check.ok) {
    const existing = await check.json();
    sha = existing.sha;
  }
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;
  const res = await fetch(api(`contents/${filePath}`), {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  return res.ok;
}

export async function walkVault(subPath = ""): Promise<string[]> {
  const items = await listVault(subPath);
  const files: string[] = [];
  for (const item of items) {
    if (item.type === "dir") {
      const sub = await walkVault(item.path.replace(`${ROOT}/`, ""));
      files.push(...sub);
    } else {
      files.push(item.path);
    }
  }
  return files;
}

export async function searchVault(query: string): Promise<{ path: string; excerpt: string }[]> {
  const files = await walkVault();
  const results: { path: string; excerpt: string }[] = [];
  const q = query.toLowerCase();
  for (const filePath of files) {
    if (!filePath.endsWith(".md")) continue;
    const content = await readVaultFile(filePath);
    if (!content) continue;
    const idx = content.toLowerCase().indexOf(q);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 80);
    const end = Math.min(content.length, idx + 160);
    results.push({ path: filePath, excerpt: content.slice(start, end) });
    if (results.length >= 10) break;
  }
  return results;
}

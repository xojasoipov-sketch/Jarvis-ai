// Lets Pari AI propose changes via PR. Uses ENV.github() for Railway aliases.
import { ENV } from "@/lib/env";

const TOKEN = ENV.github();
const REPO = process.env.GITHUB_VAULT_REPO || process.env.GITHUB_REPOSITORY || "xojasoipov-sketch/Jarvis-ai";
const BASE_BRANCH = process.env.GITHUB_VAULT_BRANCH || "main";

export const repoConfigured = Boolean(TOKEN && REPO);

function api(path: string) {
  return path ? `https://api.github.com/repos/${REPO}/${path}` : `https://api.github.com/repos/${REPO}`;
}

function headers(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

export async function testGitHubAccess(): Promise<{ repo: string; canPush: boolean; canPR: boolean }> {
  if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan");
  const res = await fetch(api(""), { headers: headers(), signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`${res.status}: ${body?.message || "Kirish rad etildi"}`);
  }
  const data = await res.json();
  return {
    repo: data.full_name,
    canPush: Boolean(data.permissions?.push),
    canPR: Boolean(data.permissions?.pull),
  };
}

async function getBaseSha(): Promise<string> {
  const res = await fetch(api(`git/ref/heads/${BASE_BRANCH}`), { headers: headers(), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Base branch topilmadi: ${res.status}`);
  const data = await res.json();
  return data.object.sha;
}

async function createBranch(name: string, fromSha: string): Promise<void> {
  const res = await fetch(api("git/refs"), {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ref: `refs/heads/${name}`, sha: fromSha }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok && res.status !== 422) throw new Error(`Branch yaratilmadi: ${res.status}`);
}

async function getFileSha(path: string, branch: string): Promise<string | undefined> {
  const res = await fetch(api(`contents/${encodeURI(path)}?ref=${branch}`), { headers: headers(), signal: AbortSignal.timeout(8000) });
  if (!res.ok) return undefined;
  const data = await res.json();
  return data.sha;
}

async function putFile(path: string, content: string, branch: string, message: string): Promise<void> {
  const sha = await getFileSha(path, branch);
  const res = await fetch(api(`contents/${encodeURI(path)}`), {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Fayl yozilmadi (${path}): ${res.status}`);
}

async function openPR(branch: string, title: string, body: string): Promise<string> {
  const res = await fetch(api("pulls"), {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ title, head: branch, base: BASE_BRANCH, body }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`PR ochilmadi: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.html_url;
}

export async function proposeCodeChange(
  description: string,
  files: { path: string; content: string }[]
): Promise<{ prUrl: string; branch: string }> {
  if (!repoConfigured) throw new Error("GITHUB_TOKEN yoki repo sozlanmagan");
  if (!files.length) throw new Error("Kamida bitta fayl kerak");

  const baseSha = await getBaseSha();
  const branch = `pari-ai/auto-${Date.now()}`;
  await createBranch(branch, baseSha);

  for (const f of files) {
    await putFile(f.path, f.content, branch, `pari-ai: ${description.slice(0, 60)}`);
  }

  const prUrl = await openPR(
    branch,
    `Pari AI: ${description.slice(0, 70)}`,
    `${description}\n\n---\nBu o'zgarish Pari AI tomonidan avtomatik taklif qilindi.`
  );

  return { prUrl, branch };
}

export async function listPullRequests() {
  if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan");
  const res = await fetch(api("pulls?state=all&per_page=20&sort=updated&direction=desc"), {
    headers: headers(),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`PR ro'yxati: ${res.status}`);
  const data = await res.json();
  return (data as Record<string, unknown>[]).map((pr) => ({
    number: pr.number as number,
    title: pr.title as string,
    htmlUrl: pr.html_url as string,
    state: pr.state as "open" | "closed",
    merged: Boolean((pr as { merged_at?: string }).merged_at),
    branch: (pr.head as { ref: string }).ref,
  }));
}

export async function mergePullRequest(prNumber: number): Promise<{ merged: boolean; sha: string }> {
  if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan");
  const res = await fetch(api(`pulls/${prNumber}/merge`), {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ merge_method: "squash" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`PR merge xato: ${res.status}`);
  const data = await res.json();
  return { merged: data.merged, sha: data.sha };
}

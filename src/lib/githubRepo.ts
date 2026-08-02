import { ENV } from "@/lib/env";

const TOKEN = ENV.github();
const REPO =
  process.env.GITHUB_VAULT_REPO || process.env.GITHUB_REPOSITORY || "xojasoipov-sketch/Jarvis-ai";
const BASE_BRANCH = process.env.GITHUB_VAULT_BRANCH || "main";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || "";
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || "";

export const repoConfigured = Boolean(TOKEN && REPO);
export const vercelConfigured = Boolean(VERCEL_TOKEN);

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
  const res = await fetch(api(`git/ref/heads/${BASE_BRANCH}`), {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
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
  const res = await fetch(api(`contents/${encodeURI(path)}?ref=${branch}`), {
    headers: headers(),
    signal: AbortSignal.timeout(8000),
  });
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
    `${description}\n\n---\nPari AI avtomatik taklif.`
  );
  return { prUrl, branch };
}

export type PullRequestInfo = {
  number: number;
  title: string;
  htmlUrl: string;
  state: "open" | "closed";
  merged: boolean;
  branch: string;
  createdAt: string;
  updatedAt: string;
};

export async function listPullRequests(): Promise<PullRequestInfo[]> {
  if (!repoConfigured) throw new Error("GITHUB_TOKEN yoki repo sozlanmagan");
  const res = await fetch(api("pulls?state=all&per_page=20&sort=updated&direction=desc"), {
    headers: headers(),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`PR ro'yxati olinmadi: ${res.status} — ${body?.message || ""}`);
  }
  const data = await res.json();
  return (data as Record<string, unknown>[]).map((pr) => ({
    number: pr.number as number,
    title: pr.title as string,
    htmlUrl: pr.html_url as string,
    state: pr.state as "open" | "closed",
    merged: Boolean((pr as { merged_at?: string }).merged_at),
    branch: (pr.head as { ref: string }).ref,
    createdAt: pr.created_at as string,
    updatedAt: pr.updated_at as string,
  }));
}

export async function getPullRequestDiff(prNumber: number): Promise<string> {
  if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan");
  const res = await fetch(api(`pulls/${prNumber}`), {
    headers: headers({ Accept: "application/vnd.github.v3.diff" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Diff olinmadi: ${res.status}`);
  return res.text();
}

export async function mergePullRequest(prNumber: number): Promise<{ merged: boolean; sha: string }> {
  if (!repoConfigured) throw new Error("GITHUB_TOKEN sozlanmagan");
  const res = await fetch(api(`pulls/${prNumber}/merge`), {
    method: "PUT",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ merge_method: "squash" }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`PR merge xato: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { merged: data.merged, sha: data.sha };
}

/** Vercel qoldiq — Railway asosiy. Token bo'lmasa xato. */
export async function vercelRedeploy(): Promise<{ url: string; id: string }> {
  if (!VERCEL_TOKEN) throw new Error("VERCEL_TOKEN yo'q (Railway ishlatiladi)");
  const [org, repoName] = REPO.split("/");
  const url = VERCEL_TEAM_ID
    ? `https://api.vercel.com/v13/deployments?teamId=${VERCEL_TEAM_ID}`
    : "https://api.vercel.com/v13/deployments";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "pari-ai",
      project: VERCEL_PROJECT_ID,
      target: "production",
      gitSource: { type: "github", org, repo: repoName, ref: BASE_BRANCH },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Vercel redeploy: ${res.status}`);
  const data = await res.json();
  return { url: `https://${data.url}`, id: data.id };
}

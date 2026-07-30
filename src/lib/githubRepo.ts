// Lets Pari AI propose changes to its own source code — always via a Pull Request,
// never a direct push to main. A human reviews and merges.

const TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = process.env.GITHUB_VAULT_REPO || process.env.GITHUB_REPOSITORY || "";
const BASE_BRANCH = process.env.GITHUB_VAULT_BRANCH || "main";

export const repoConfigured = Boolean(TOKEN && REPO);

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
    `${description}\n\n---\nBu o'zgarish Pari AI tomonidan avtomatik taklif qilindi. Tekshirib, merge qilishdan oldin diff'ni ko'rib chiqing.`
  );

  return { prUrl, branch };
}

import { NextRequest, NextResponse } from "next/server";
import { repoConfigured, vercelConfigured, listPullRequests, mergePullRequest, vercelRedeploy } from "@/lib/githubRepo";

// GET /api/sessions — list Pari AI's self-improvement sessions (= GitHub PRs it opened)
export async function GET() {
  if (!repoConfigured) {
    return NextResponse.json({ configured: false, sessions: [] });
  }
  try {
    const prs = await listPullRequests();
    const sessions = prs
      .filter((pr) => pr.branch.startsWith("pari-ai/"))
      .map((pr) => ({
        id: pr.number,
        title: pr.title,
        branch: pr.branch,
        url: pr.htmlUrl,
        status: pr.merged ? "merged" : pr.state === "open" ? "open" : "closed",
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
      }));
    return NextResponse.json({ configured: true, sessions });
  } catch (err) {
    return NextResponse.json({ configured: true, sessions: [], error: (err as Error).message }, { status: 200 });
  }
}

// POST /api/sessions { action: "merge" | "redeploy", prNumber? }
export async function POST(req: NextRequest) {
  const { action, prNumber } = await req.json();

  if (action === "merge") {
    if (!repoConfigured) return NextResponse.json({ error: "GITHUB_TOKEN sozlanmagan" }, { status: 400 });
    if (!prNumber) return NextResponse.json({ error: "prNumber kerak" }, { status: 400 });
    try {
      const result = await mergePullRequest(Number(prNumber));
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  if (action === "redeploy") {
    if (!vercelConfigured) return NextResponse.json({ error: "VERCEL_TOKEN sozlanmagan" }, { status: 400 });
    try {
      const result = await vercelRedeploy();
      return NextResponse.json({ ok: true, ...result });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Noma'lum action" }, { status: 400 });
}

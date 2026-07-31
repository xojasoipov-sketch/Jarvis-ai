import { NextResponse } from "next/server";
import { testGitHubAccess } from "@/lib/githubRepo";

// GET /api/github/test — confirms GITHUB_TOKEN actually works and shows what it can do
export async function GET() {
  try {
    const info = await testGitHubAccess();
    return NextResponse.json({
      ok: true,
      info: `${info.repo} — push: ${info.canPush ? "✅" : "❌"}, PR: ${info.canPR ? "✅" : "❌"}`,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}

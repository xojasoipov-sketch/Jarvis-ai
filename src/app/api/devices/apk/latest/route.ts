import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

// GitHub Releases'dagi eng so'nggi APK — Android agent shu endpointni so'rab,
// o'zidagi versionCode'dan kattaroq versiya chiqqan bo'lsa avtomatik yuklab oladi.
const REPO = process.env.JARVIS_APK_REPO || "xojasoipov-sketch/Jarvis-ai";

type GhAsset = { name: string; browser_download_url: string; size: number };
type GhRelease = { tag_name: string; assets: GhAsset[]; published_at: string };

/** "v1.0.42" → 42 (versionCode CI run_number bilan bir xil) */
function versionCodeFromTag(tag: string): number {
  const m = tag.match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

export const revalidate = 300; // 5 daqiqa kesh — GitHub API limitini tejaydi

export async function GET() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `GitHub API ${res.status}` }, { status: 502 });
    }

    const release = (await res.json()) as GhRelease;
    const apk = release.assets?.find((a) => a.name.endsWith(".apk"));
    if (!apk) {
      return NextResponse.json({ error: "Release'da APK topilmadi" }, { status: 404 });
    }

    return NextResponse.json({
      version_code: versionCodeFromTag(release.tag_name),
      version_name: release.tag_name.replace(/^v/, ""),
      download_url: apk.browser_download_url,
      size_bytes: apk.size,
      published_at: release.published_at,
    });
  } catch (err) {
    log("error", "devices", `apk/latest: ${(err as Error).message}`);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

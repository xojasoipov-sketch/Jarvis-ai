"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const PariOrb = dynamic(() => import("@/components/ultron/PariOrb"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[100dvh] items-center justify-center bg-black text-white/40 text-sm">
      Orb yuklanmoqda…
    </div>
  ),
});

export default function OrbPage() {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <PariOrb />
      <div className="pointer-events-none absolute left-3 top-3 z-20 flex gap-2">
        <Link
          href="/pari"
          className="pointer-events-auto rounded-lg border border-white/15 bg-black/50 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur"
        >
          ← Graph
        </Link>
        <Link
          href="/chat"
          className="pointer-events-auto rounded-lg border border-white/15 bg-black/50 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur"
        >
          Chat
        </Link>
      </div>
    </div>
  );
}

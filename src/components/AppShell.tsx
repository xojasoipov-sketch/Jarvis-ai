"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { MessageSquare, Bot, LayoutGrid, Briefcase, Settings, Menu, X } from "lucide-react";

const BOTTOM = [
  { href: "/pari", label: "Pari", icon: LayoutGrid },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/agents", label: "Agent", icon: Bot },
  { href: "/portfolio", label: "Studio", icon: Briefcase },
  { href: "/settings", label: "Sozlama", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname() || "/";
  const router = useRouter();

  // Faqat login va portfolio — to'liq public, shell yo'q
  if (path === "/login" || path === "/portfolio" || path.startsWith("/portfolio/")) {
    return <>{children}</>;
  }

  const isPari = path === "/pari" || path === "/";

  return (
    <div
      className="flex h-[100dvh] overflow-hidden"
      style={{ background: isPari ? "#050510" : "#f8f9fc" }}
    >
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar drawer */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[min(288px,85vw)] transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header: oddiy sahifalar */}
        {!isPari && <Header onMenu={() => setOpen((o) => !o)} />}

        {/* Pari: qorong'u floating menu */}
        {isPari && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="fixed top-3 left-3 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-black/50 text-white backdrop-blur-md active:scale-95 lg:hidden"
            aria-label="Menyu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Desktop: pari ham menyu */}
        {isPari && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="fixed top-3 left-3 z-30 hidden h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-white/80 backdrop-blur lg:flex"
            aria-label="Menyu"
          >
            <Menu size={18} />
          </button>
        )}

        <main
          className={`flex-1 overflow-y-auto ${
            isPari ? "p-0" : "p-3 pb-20 sm:p-4 lg:p-6 lg:pb-6"
          }`}
        >
          {children}
        </main>

        {/* Pastki mobil navigatsiya */}
        <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-200/80 bg-white/95 backdrop-blur-md lg:hidden safe-bottom">
          <div className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
            {BOTTOM.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/pari"
                  ? isPari
                  : path === href || path.startsWith(href + "/");
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(href);
                  }}
                  className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                    active ? "text-indigo-600" : "text-gray-500"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

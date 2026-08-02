"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut, X, ChevronDown, ChevronRight, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import { MODULES, MODULE_GROUPS, type ModuleDef } from "@/lib/modules";

function NavLink({
  href, label, icon: Icon, onClose, nested,
}: {
  href: string; label: string; icon: LucideIcon; onClose?: () => void; nested?: boolean;
}) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path === href || (href !== "/" && path.startsWith(href + "/"));
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`flex items-center gap-2.5 rounded-lg text-sm transition-all ${
        nested ? "px-2 py-1.5 text-xs" : "px-3 py-2"
      } ${
        active
          ? "bg-gray-900 text-white font-medium"
          : nested
            ? "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <Icon size={nested ? 13 : 15} strokeWidth={1.75} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

function ModuleNav({ mod, onClose }: { mod: ModuleDef; onClose?: () => void }) {
  const path = usePathname();
  const hasRoutes = Boolean(mod.routes?.length);
  const childActive = mod.routes?.some((r) => path === r.href);
  const topActive = mod.href === "/" ? path === "/" : path.startsWith(mod.href);
  const [open, setOpen] = useState(topActive || Boolean(childActive));
  const Icon = mod.icon;

  if (!hasRoutes) {
    return <NavLink href={mod.href} label={mod.name} icon={Icon} onClose={onClose} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
          topActive || childActive ? "text-gray-900 font-semibold" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
        }`}
      >
        <Icon size={15} strokeWidth={1.75} className="flex-shrink-0" />
        <span className="flex-1 text-left">{mod.name}</span>
        {open ? (
          <ChevronDown size={12} className="text-gray-400" />
        ) : (
          <ChevronRight size={12} className="text-gray-400" />
        )}
      </button>
      {open && (
        <div className="ml-3.5 mt-0.5 mb-1 pl-3 border-l border-gray-100 space-y-0.5">
          {mod.routes!.map((r) => (
            <NavLink
              key={r.href}
              href={r.href}
              label={r.label}
              icon={r.icon || Icon}
              onClose={onClose}
              nested
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={logout} title="Chiqish" className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
      <LogOut size={15} strokeWidth={1.75} />
    </button>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">BF</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-none truncate">Pari AI</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">Business Factory OS</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <NotificationBell />
          <ThemeToggle />
          <LogoutButton />
          {onClose && (
            <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 md:hidden">
              <X size={15} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {MODULE_GROUPS.map((g) => {
          const mods = MODULES.filter((m) => m.group === g.id);
          // Deduplicate by href primary for cleaner nav (client_portal shares clients)
          const seen = new Set<string>();
          const unique = mods.filter((m) => {
            if (m.id === "client_portal" || m.id === "workflow_builder" || m.id === "api_center") return false;
            if (seen.has(m.href) && m.id !== "dashboard") return false;
            seen.add(m.href);
            return true;
          });
          if (!unique.length) return null;
          return (
            <div key={g.id}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {g.label}
              </p>
              <div className="space-y-0.5">
                {unique.map((m) => (
                  <ModuleNav key={m.id} mod={m} onClose={onClose} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-3 py-2.5 border-t border-gray-100">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
          }}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white">⌘K</kbd>
        </button>
        <div className="flex items-center gap-2 mt-2 px-1">
          <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            S
          </div>
          <p className="text-xs text-gray-500 flex-1 truncate">Workspace · Owner</p>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <aside className="w-56 h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      <SidebarContent onClose={onClose} />
    </aside>
  );
}

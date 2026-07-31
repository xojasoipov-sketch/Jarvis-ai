"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid, MessageSquare, History, Bot, CheckSquare, FolderKanban, BookOpen, Brain,
  Zap, Calendar, FolderOpen, BarChart3, Code2, Database, Plug, Sparkles,
  Wrench, Settings, ShieldCheck, CreditCard, ScrollText, LogOut, X, Radio, GitPullRequest, type LucideIcon,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

type NavEntry = { label: string; href: string; icon: LucideIcon };

const nav: NavEntry[] = [
  { label: "Pari", href: "/pari", icon: Sparkles },
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Chat with AI", href: "/chat", icon: MessageSquare },
  { label: "History", href: "/history", icon: History },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Knowledge Hub", href: "/knowledge", icon: BookOpen },
  { label: "Skill Tree", href: "/skilltree", icon: Brain },
  { label: "Automation", href: "/automation", icon: Zap },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Files", href: "/files", icon: FolderOpen },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "SMM", href: "/smm", icon: Radio },
];

const devNav: NavEntry[] = [
  { label: "Code Editor", href: "/code", icon: Code2 },
  { label: "Sessions", href: "/sessions", icon: GitPullRequest },
  { label: "Databases", href: "/databases", icon: Database },
  { label: "Connectors", href: "/apis", icon: Plug },
  { label: "Dev Tools", href: "/devtools", icon: Wrench },
];

const sysNav: NavEntry[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Security", href: "/security", icon: ShieldCheck },
  { label: "Usage & Billing", href: "/billing", icon: CreditCard },
  { label: "Logs", href: "/logs", icon: ScrollText },
];

function NavItem({ item, onClose }: { item: NavEntry; onClose?: () => void }) {
  const path = usePathname();
  const active = path === item.href;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? "bg-indigo-50 text-indigo-600 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <Icon size={16} strokeWidth={1.75} className="w-5 flex-shrink-0" />
      {item.label}
    </Link>
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
    <button onClick={logout} title="Chiqish" className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
      <LogOut size={15} strokeWidth={1.75} />
    </button>
  );
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Pari AI" width={36} height={36} className="object-contain" />
          <span className="font-bold text-gray-900 text-lg tracking-tight">PARI AI</span>
          {onClose && (
            <button onClick={onClose} className="ml-auto p-1 text-gray-400 hover:text-gray-600 lg:hidden">
              <X size={16} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {nav.map((item) => <NavItem key={item.href} item={item} onClose={onClose} />)}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">Development</p>
        {devNav.map((item) => <NavItem key={item.href} item={item} onClose={onClose} />)}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">System</p>
        {sysNav.map((item) => <NavItem key={item.href} item={item} onClose={onClose} />)}
      </nav>

      <div className="px-3 pb-2">
        <Link href="/skilltree" onClick={onClose} className="block p-3 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:opacity-95 transition-opacity">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">SB</div>
            <p className="text-sm font-semibold truncate">Second Brain Project</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </div>
        </Link>
      </div>

      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">S</div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-gray-900 truncate">Sadi</p>
          </div>
          <NotificationBell />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

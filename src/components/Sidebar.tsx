"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, MessageSquare, Bot, CheckSquare, FolderKanban, BookOpen, Brain,
  Zap, Calendar, FolderOpen, BarChart3, Code2, Database, Plug,
  Wrench, Settings, ShieldCheck, CreditCard, ScrollText, ChevronDown, type LucideIcon,
} from "lucide-react";

type NavEntry = { label: string; href: string; icon: LucideIcon };

const nav: NavEntry[] = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Chat with AI", href: "/chat", icon: MessageSquare },
  { label: "Agents", href: "/agents", icon: Bot },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Knowledge Hub", href: "/knowledge", icon: BookOpen },
  { label: "Skill Tree", href: "/skilltree", icon: Brain },
  { label: "Automation", href: "/automation", icon: Zap },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Files", href: "/files", icon: FolderOpen },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

const devNav: NavEntry[] = [
  { label: "Code Editor", href: "/code", icon: Code2 },
  { label: "Databases", href: "/databases", icon: Database },
  { label: "APIs & Integrations", href: "/apis", icon: Plug },
  { label: "Dev Tools", href: "/devtools", icon: Wrench },
];

const sysNav: NavEntry[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Security", href: "/security", icon: ShieldCheck },
  { label: "Usage & Billing", href: "/billing", icon: CreditCard },
  { label: "Logs", href: "/logs", icon: ScrollText },
];

function NavItem({ item }: { item: NavEntry }) {
  const path = usePathname();
  const active = path === item.href;
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
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

function ButterflyLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 8C16 8 13 2 8 3C3 4 3 11 7 13C10.5 14.7 15 12 16 9V22C16 22 12 27 8 27C4 27 2 23 4 20"
        stroke="url(#pari-grad-l)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M16 8C16 8 19 2 24 3C29 4 29 11 25 13C21.5 14.7 17 12 16 9V22C16 22 20 27 24 27C28 27 30 23 28 20"
        stroke="url(#pari-grad-l)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <defs>
        <linearGradient id="pari-grad-l" x1="3" y1="3" x2="29" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ButterflyLogo />
          <span className="font-bold text-gray-900 text-lg tracking-tight">PARI AI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {nav.map((item) => <NavItem key={item.href} item={item} />)}

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">Development</p>
        {devNav.map((item) => <NavItem key={item.href} item={item} />)}

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">System</p>
        {sysNav.map((item) => <NavItem key={item.href} item={item} />)}
      </nav>

      {/* Second Brain project widget */}
      <div className="px-3 pb-2">
        <Link href="/skilltree" className="block p-3 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:opacity-95 transition-opacity">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
              SB
            </div>
            <p className="text-sm font-semibold truncate">Second Brain Project</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </div>
        </Link>
      </div>

      {/* User + credits */}
      <div className="px-3 py-3 border-t border-gray-100">
        <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 transition-all">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            S
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-gray-900 truncate">Sadi Prime</p>
            <p className="text-xs text-indigo-600">Pro Plan</p>
          </div>
          <ChevronDown size={14} strokeWidth={1.75} className="text-gray-400 flex-shrink-0" />
        </button>
        <div className="mt-2 px-2">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Credits</span>
            <span className="font-medium text-gray-700">12,450 / 20,000</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: "62%" }} />
          </div>
        </div>
      </div>
    </aside>
  );
}

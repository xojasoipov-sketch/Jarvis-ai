"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, MessageSquare, Bot, CheckSquare, FolderKanban, BookOpen, Brain,
  Zap, Calendar, FolderOpen, BarChart3, Code2, Database, Plug,
  Wrench, Settings, ShieldCheck, CreditCard, ScrollText, type LucideIcon,
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
          ? "bg-[#ff6a1a]/10 text-[#ff8a3d] font-medium"
          : "text-[#a39d92] hover:bg-[#0a0a0c] hover:text-[#f5f1ea]"
      }`}
    >
      <Icon size={16} strokeWidth={1.75} className="w-5 flex-shrink-0" />
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-[#141316] border-r border-white/[0.08] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6a1a] to-[#7a1f1f] flex items-center justify-center text-white text-sm font-bold">
            P
          </div>
          <span className="font-bold text-[#f5f1ea]">Pari AI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {nav.map((item) => <NavItem key={item.href} item={item} />)}

        <p className="text-xs font-semibold text-[#5c584f] uppercase tracking-wider px-3 pt-4 pb-1">Development</p>
        {devNav.map((item) => <NavItem key={item.href} item={item} />)}

        <p className="text-xs font-semibold text-[#5c584f] uppercase tracking-wider px-3 pt-4 pb-1">System</p>
        {sysNav.map((item) => <NavItem key={item.href} item={item} />)}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/[0.08]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-gradient-to-r from-[#ff6a1a]/10 to-transparent">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff8a3d] to-[#ff5a1f] flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#f5f1ea] truncate">Sadi Prime</p>
            <p className="text-xs text-[#ff8a3d]">Elite Plan</p>
          </div>
        </div>
        <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-[#ff6a1a] to-[#ff9a4d]" />
      </div>
    </aside>
  );
}

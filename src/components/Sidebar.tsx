"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Brain, Briefcase, ShoppingCart, Users, Bot,
  Tv2, Clapperboard, Zap, BookOpen, BarChart3, Wallet,
  Store, Settings, LogOut, X, type LucideIcon,
  MessageSquare, CheckSquare, FolderKanban, Calendar, FolderOpen,
  Radio, Code2, Database, Wrench, ShieldCheck, CreditCard,
  ScrollText, Sparkles, History, ChevronDown, ChevronRight, Plug,
} from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";

type NavEntry = { label: string; href: string; icon: LucideIcon };
type NavGroup = {
  label: string; icon: LucideIcon; href: string;
  items?: NavEntry[]; badge?: string;
};

const mainNav: NavGroup[] = [
  { label: "Asosiy (Pari)", icon: Sparkles, href: "/pari" },
  {
    label: "AI Brain",
    icon: Brain,
    href: "/chat",
    items: [
      { label: "Kapalak miya", href: "/pari", icon: Sparkles },
      { label: "Chat", href: "/chat", icon: MessageSquare },
      { label: "Tarix", href: "/history", icon: History },
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Business",
    icon: Briefcase,
    href: "/services",
    items: [
      { label: "Xizmatlar", href: "/services", icon: Briefcase },
      { label: "Buyurtmalar", href: "/orders", icon: ShoppingCart },
      { label: "Mijozlar", href: "/clients", icon: Users },
    ],
  },
  {
    label: "AI Employees",
    icon: Bot,
    href: "/agents",
    items: [
      { label: "Agentlar", href: "/agents", icon: Bot },
      { label: "Vazifalar", href: "/tasks", icon: CheckSquare },
      { label: "Loyihalar", href: "/projects", icon: FolderKanban },
    ],
  },
  {
    label: "Content Factory",
    icon: Tv2,
    href: "/smm",
    items: [
      { label: "SMM", href: "/smm", icon: Radio },
      { label: "Biznes", href: "/business", icon: Briefcase },
    ],
  },
  { label: "Media Studio", icon: Clapperboard, href: "/media" },
  {
    label: "Automation",
    icon: Zap,
    href: "/automation",
    items: [
      { label: "Workflows", href: "/automation", icon: Zap },
      { label: "Calendar", href: "/calendar", icon: Calendar },
      { label: "Fayllar", href: "/files", icon: FolderOpen },
    ],
  },
  { label: "Knowledge / Obsidian", icon: BookOpen, href: "/knowledge" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Finance", icon: Wallet, href: "/billing" },
  { label: "Marketplace", icon: Store, href: "/marketplace" },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
    items: [
      { label: "Sozlamalar", href: "/settings", icon: Settings },
      { label: "Xavfsizlik", href: "/security", icon: ShieldCheck },
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Loglar", href: "/logs", icon: ScrollText },
      { label: "Dev Tools", href: "/devtools", icon: Wrench },
      { label: "Code", href: "/code", icon: Code2 },
      { label: "Databases", href: "/databases", icon: Database },
      { label: "Connectors", href: "/apis", icon: Plug },
    ],
  },
];

function NavGroupItem({ group, onClose }: { group: NavGroup; onClose?: () => void }) {
  const path = usePathname();
  const isTop = path === group.href || path.startsWith(group.href + "/");
  const hasActive = group.items?.some((i) => path === i.href);
  const [open, setOpen] = useState(isTop || Boolean(hasActive));
  const Icon = group.icon;

  if (!group.items) {
    return (
      <Link
        href={group.href}
        onClick={onClose}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
          isTop ? "bg-gray-900 text-white font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Icon size={15} strokeWidth={1.75} className="flex-shrink-0" />
        <span className="flex-1">{group.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
          isTop || hasActive ? "text-gray-900 font-semibold" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
        }`}
      >
        <Icon size={15} strokeWidth={1.75} className="flex-shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        {open ? (
          <ChevronDown size={12} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={12} strokeWidth={2} className="text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="ml-3.5 mt-0.5 mb-1 pl-3 border-l border-gray-100 space-y-0.5">
          {group.items.map((item) => {
            const active = path === item.href;
            const IIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all ${
                  active ? "bg-gray-900 text-white font-medium" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                }`}
              >
                <IIcon size={13} strokeWidth={1.75} className="flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
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
        <Link href="/pari" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="w-7 h-7 rounded-lg bg-violet-700 flex items-center justify-center flex-shrink-0">
            <Sparkles size={14} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">Pari AI</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Kapalak miya</p>
          </div>
        </Link>
        <div className="flex items-center gap-0.5">
          <NotificationBell />
          <ThemeToggle />
          <LogoutButton />
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 md:hidden">
              <X size={15} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {mainNav.map((g) => (
          <NavGroupItem key={g.label} group={g} onClose={onClose} />
        ))}
      </nav>

      <div className="px-4 py-2.5 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-violet-700 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            P
          </div>
          <p className="text-xs text-gray-500 flex-1">Pari · Second Brain</p>
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

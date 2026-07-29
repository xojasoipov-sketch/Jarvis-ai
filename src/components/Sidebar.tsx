"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { label: "Dashboard", href: "/", icon: "⊞" },
  { label: "Chat with AI", href: "/chat", icon: "💬" },
  { label: "Agents", href: "/agents", icon: "🤖" },
  { label: "Tasks", href: "/tasks", icon: "✓" },
  { label: "Projects", href: "/projects", icon: "📁" },
  { label: "Knowledge Hub", href: "/knowledge", icon: "📚" },
  { label: "Automation", href: "/automation", icon: "⚡" },
  { label: "Calendar", href: "/calendar", icon: "📅" },
  { label: "Files", href: "/files", icon: "🗂" },
  { label: "Analytics", href: "/analytics", icon: "📊" },
];

const devNav = [
  { label: "Code Editor", href: "/code", icon: "<>" },
  { label: "Databases", href: "/databases", icon: "🗄" },
  { label: "APIs & Integrations", href: "/apis", icon: "🔌" },
  { label: "Dev Tools", href: "/devtools", icon: "🔧" },
];

const sysNav = [
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "Security", href: "/security", icon: "🔒" },
  { label: "Usage & Billing", href: "/billing", icon: "💳" },
  { label: "Logs", href: "/logs", icon: "📋" },
];

function NavItem({ item }: { item: typeof nav[0] }) {
  const path = usePathname();
  const active = path === item.href;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? "bg-indigo-50 text-indigo-600 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className="text-base w-5 text-center">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            P
          </div>
          <span className="font-bold text-gray-900">Pari AI</span>
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

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">Sadi Prime</p>
            <p className="text-xs text-indigo-500">Elite Plan</p>
          </div>
        </div>
        <div className="mt-2 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
      </div>
    </aside>
  );
}

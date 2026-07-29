"use client";
import { useState } from "react";
import { Search, Plus, Bell } from "lucide-react";

export default function Header() {
  const [search, setSearch] = useState("");

  return (
    <header className="h-14 bg-[#141316] border-b border-white/[0.08] flex items-center px-6 gap-4 flex-shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-xl relative">
        <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c584f]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search anything..."
          className="w-full pl-9 pr-16 py-2 text-sm bg-[#0a0a0c] border border-white/[0.12] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6a1a]/30 focus:border-[#ff6a1a]/50 transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5c584f] bg-[#141316] border border-white/[0.12] rounded px-1.5 py-0.5">⌘K</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button className="flex items-center gap-2 bg-[#ff6a1a] hover:bg-[#e85a0f] text-white text-sm font-medium px-4 py-2 rounded-xl transition-all">
          <Plus size={15} strokeWidth={2} /> New Task
        </button>
        <button className="relative p-2 text-[#7d7870] hover:text-[#cfc9bd] hover:bg-[#0a0a0c] rounded-xl">
          <Bell size={17} strokeWidth={1.75} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff6a1a] rounded-full" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff8a3d] to-[#ff5a1f] flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-[#f5f1ea]">Sadi Prime</p>
            <p className="text-xs text-[#7d7870]">Elite Plan</p>
          </div>
        </div>
      </div>
    </header>
  );
}

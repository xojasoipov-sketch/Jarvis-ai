"use client";
import { useState } from "react";
import { Search, Plus, Bell, ChevronDown, Menu } from "lucide-react";

export default function Header({ onMenu }: { onMenu?: () => void }) {
  const [search, setSearch] = useState("");
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-3 flex-shrink-0">
      <button
        onClick={onMenu}
        className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-all"
      >
        <Menu size={18} strokeWidth={1.75} />
      </button>

      <div className="flex-1 max-w-xl relative">
        <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search anything..."
          className="w-full pl-9 pr-16 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5 hidden sm:block">⌘K</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all">
          <Plus size={15} strokeWidth={2} /> New Task
        </button>
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl">
          <Bell size={17} strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>
        <button className="flex items-center gap-1.5 hover:bg-gray-50 rounded-xl px-1.5 py-1 transition-all">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-gray-900">Sadi Prime</p>
            <p className="text-xs text-gray-500">Pro Plan</p>
          </div>
          <ChevronDown size={14} strokeWidth={1.75} className="text-gray-400 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}

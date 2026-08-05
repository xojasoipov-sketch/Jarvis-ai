"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Bell, ChevronDown, Menu } from "lucide-react";

export default function Header({ onMenu }: { onMenu?: () => void }) {
  const [search, setSearch] = useState("");
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) router.push(`/chat?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="sticky top-0 z-20 h-14 bg-white/95 backdrop-blur border-b border-gray-100 flex items-center px-3 sm:px-4 lg:px-6 gap-2 sm:gap-3 flex-shrink-0">
      <button
        type="button"
        onClick={onMenu}
        className="lg:hidden flex h-11 w-11 items-center justify-center text-gray-700 hover:bg-gray-100 rounded-xl active:scale-95"
        aria-label="Menyu ochish"
      >
        <Menu size={22} strokeWidth={2} />
      </button>

      <form onSubmit={handleSearch} className="flex-1 max-w-xl relative min-w-0">
        <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Qidirish..."
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </form>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={() => router.push("/tasks")}
          className="hidden sm:flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-3 py-2 rounded-xl"
        >
          <Plus size={15} strokeWidth={2} /> Task
        </button>
        <button type="button" className="relative p-2.5 text-gray-500 rounded-xl hover:bg-gray-50">
          <Bell size={18} strokeWidth={1.75} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex items-center gap-1.5 rounded-xl px-1.5 py-1 hover:bg-gray-50"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            S
          </div>
          <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
        </button>
      </div>
    </header>
  );
}

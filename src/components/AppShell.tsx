"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // Login sahifasida sidebar/header yo'q — reload/redirect loop oldini oladi
  if (path === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8f9fc" }}>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenu={() => setOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

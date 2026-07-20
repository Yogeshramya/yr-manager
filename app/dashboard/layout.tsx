"use client";

import React, { useState } from "react";
import Sidebar from "@/app/components/layout/Sidebar";
import Header from "@/app/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-900 p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
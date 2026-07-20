"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  User,
  TrendingUp,
  TrendingDown,
  X,
} from "lucide-react";

const menus = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Income Report",
    href: "/dashboard/income-report",
    icon: TrendingUp,
  },
  {
    title: "Expense Report",
    href: "/dashboard/expense-report",
    icon: TrendingDown,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    title: "System Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const [initialLetter, setInitialLetter] = useState("Y");

  useEffect(() => {
    const fetchUserInitial = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const rawIdentifier = data.user.username || data.user.name || "Y";
            setInitialLetter(rawIdentifier.charAt(0).toUpperCase());
          }
        }
      } catch (err) {
        console.error("Failed to load user initial in sidebar", err);
      }
    };
    fetchUserInitial();
  }, []);

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Title / Logo with First Letter Branding */}
        <div className="p-6 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gold-gradient flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-gold-500/20">
              {initialLetter}
            </div>
            
              <span className="font-bold text-xl text-gold-gradient">Manager</span>
          
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-slate-500 hover:text-white p-1 rounded-lg"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5 px-4 py-6">
          {menus.map((menu) => {
            const isActive = pathname === menu.href;
            return (
              <Link
                key={menu.href}
                href={menu.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition duration-150 ${
                  isActive
                    ? "bg-gold-gradient text-slate-950 shadow-lg shadow-gold-500/10 font-bold"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-white"
                }`}
              >
                <menu.icon size={18} className={isActive ? "text-slate-950" : "text-slate-400"} />
                {menu.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* SaaS info branding footer */}
      <div className="p-6 border-t border-slate-900">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">ERP Platform</p>
        <p className="text-xs text-slate-400 font-bold mt-1">{initialLetter} Digital Workspace</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:flex w-72 bg-slate-950 border-r border-slate-800 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Mobile Drawer */}
          <aside className="relative z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-250">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Menu, Clock, LogOut } from "lucide-react";

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

function formatLastLogin(dateStr?: string) {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Just now";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Just now";
  }
}

export default function Header({ onToggleMobileSidebar }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [businessName, setBusinessName] = useState("Digital Workspace");
  const [userName, setUserName] = useState("Admin");
  const [initialLetter, setInitialLetter] = useState("A");
  const [lastLogin, setLastLogin] = useState<string>("");

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const displayName = data.user.username || data.user.name || "Admin";
            setUserName(displayName);
            setInitialLetter(displayName.charAt(0).toUpperCase());
            if (data.user.lastLoginAt) {
              setLastLogin(data.user.lastLoginAt);
            }
            if (data.user.businessId) {
              setBusinessName(data.user.businessId.name);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load header auth details", err);
      }
    };
    fetchUser();
  }, []);

  const getPageTitle = () => {
    if (pathname.includes("/income-report")) return "Income Report";
    if (pathname.includes("/expense-report")) return "Expense Report";
    if (pathname.includes("/profile")) return "Business Profile";
    if (pathname.includes("/settings")) return "System Settings";
    return "Overview";
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 transition"
            aria-label="Toggle Navigation Menu"
          >
            <Menu size={20} />
          </button>
        )}

        <h1 className="text-lg sm:text-xl font-black text-white truncate">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        {/* Last Login Badge */}
        {lastLogin && (
          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-xs text-slate-400">
            <Clock size={12} className="text-gold-400" />
            <span className="text-[11px]">
              Last Login: <strong className="text-slate-200">{formatLastLogin(lastLogin)}</strong>
            </span>
          </div>
        )}

        {/* Workspace Display */}
        <span className="hidden sm:inline-block rounded-full bg-gold-950/40 border border-gold-500/20 px-3.5 py-1 text-xs font-semibold text-gold-400 truncate max-w-[180px]">
          💼 {businessName}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-950/20 px-5 py-3 text-sm font-semibold text-red-400 hover:bg-red-950/30 transition"
        >
          <LogOut size={16} />
          Logout
        </button>

        {/* User Info and Avatar */}
        <div className="flex items-center gap-3 border-l border-slate-800 pl-4 sm:pl-6">
          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold text-white capitalize">{userName}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Workspace Owner</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-gold-gradient flex items-center justify-center text-slate-950 font-extrabold text-sm border border-gold-300/20 shadow-lg shadow-gold-500/10 shrink-0">
            {initialLetter}
          </div>
        </div>
      </div>
    </header>
  );
}
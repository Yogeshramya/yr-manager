import React from "react";
import { Loader2, Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white p-4">
      <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gold-gradient flex items-center justify-center text-slate-950 font-black text-3xl shadow-2xl shadow-gold-500/20 animate-pulse">
            M
          </div>
          <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-gold-500/40 p-1.5 rounded-xl text-gold-400">
            <Sparkles size={14} className="animate-spin" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-white tracking-tight">
            Loading <span className="text-gold-gradient">Workspace</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium">Preparing commercial ERP dashboard...</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gold-400 font-semibold pt-2">
          <Loader2 size={16} className="animate-spin" />
          <span>Synchronizing live metrics</span>
        </div>
      </div>
    </div>
  );
}

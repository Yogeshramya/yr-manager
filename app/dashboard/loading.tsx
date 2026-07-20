import React from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 pb-12 animate-pulse">
      {/* Header bar skeleton */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-800/80 rounded-xl" />
          <div className="h-4 w-96 bg-slate-850/60 rounded-lg" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-slate-800/80 rounded-xl" />
          <div className="h-10 w-36 bg-slate-800/80 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 space-y-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-slate-800/80" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-20 bg-slate-800/60 rounded" />
                <div className="h-6 w-28 bg-slate-750 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics & Checklist skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-slate-800 h-80 space-y-4">
          <div className="h-6 w-48 bg-slate-800/80 rounded-lg" />
          <div className="h-56 w-full bg-slate-850/50 rounded-xl flex items-center justify-center">
            <Loader2 className="animate-spin text-gold-400" size={24} />
          </div>
        </div>

        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 h-80 space-y-4">
          <div className="h-6 w-56 bg-slate-800/80 rounded-lg" />
          <div className="h-56 w-full bg-slate-850/50 rounded-xl flex items-center justify-center">
            <Loader2 className="animate-spin text-gold-400" size={24} />
          </div>
        </div>
      </div>
    </div>
  );
}

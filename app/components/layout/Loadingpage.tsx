"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface LoadingPageProps {
  title?: string;
  subtitle?: string;
  brandLetter?: string;
  fullScreen?: boolean;
}

export default function LoadingPage({
  title = "Loading Workspace",
  subtitle = "Preparing commercial ERP dashboard...",
  brandLetter,
  fullScreen = true,
}: LoadingPageProps) {
    const [initialLetter, setInitialLetter] = useState("Y");

    useEffect(() => {
        // Only fetch user initial if brandLetter prop is not explicitly provided
        if (brandLetter) return;

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
                console.error("Failed to load user initial in loading page", err);
            }
        };

        fetchUserInitial();
    }, [brandLetter]);

    const displayLetter = brandLetter || initialLetter;

    const containerClasses = fullScreen
        ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md text-white p-4 animate-in fade-in duration-300"
        : "flex flex-col items-center justify-center min-h-[400px] w-full bg-slate-950 text-white p-6 rounded-2xl";

    const titleParts = title.split(" ");
    const firstWord = titleParts[0] || "Loading";
    const restOfTitle = titleParts.slice(1).join(" ") || "Dashboard";

    return (
        <div className={containerClasses}>
            {/* Background Ambient Glow */}
            <div className="absolute h-72 w-72 rounded-full bg-gold-500/10 blur-3xl animate-pulse pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center space-y-6 max-w-sm text-center px-4">
                {/* Animated Brand Emblem */}
                <div className="relative">
                    <div className="h-20 w-20 rounded-3xl bg-gold-gradient flex items-center justify-center text-slate-950 font-black text-4xl shadow-2xl shadow-gold-500/30 animate-pulse">
                        {displayLetter}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-gold-500/50 p-2 rounded-2xl text-gold-400 shadow-lg">
                        <Sparkles size={16} className="animate-spin" />
                    </div>
                </div>

                {/* Text Header */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        {firstWord} <span className="text-gold-gradient">{restOfTitle}</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                        {subtitle}
                    </p>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-900 border border-slate-800/80 rounded-full h-2 overflow-hidden relative shadow-inner">
                    <div className="h-full bg-gold-gradient rounded-full w-3/4 animate-pulse shadow-lg shadow-gold-500/50" />
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 rounded-full bg-slate-900 border border-slate-850 px-4 py-1.5 text-xs text-gold-400 font-semibold shadow-lg">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Synchronizing ERP workspace...</span>
                </div>
            </div>
        </div>
    );
}

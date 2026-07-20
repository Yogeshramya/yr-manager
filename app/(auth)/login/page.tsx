"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const initialLetter = username.trim() ? username.trim().charAt(0).toUpperCase() : "A";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-gold-gradient flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-gold-500/20">
              {initialLetter}
            </div>
            <h2 className="text-center text-4xl font-extrabold tracking-tight text-white">
              {initialLetter} <span className="text-gold-gradient">Manager</span>
            </h2>
          </div>
          <p className="text-center text-sm text-slate-400">
            Commercial-Grade Business ERP
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 shadow-2xl border border-slate-800">
          <h3 className="mb-6 text-xl font-bold text-white">Sign In</h3>

          {error && (
            <div className="mb-4 rounded-lg bg-red-950/50 border border-red-500/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                Username
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gold-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input block w-full rounded-lg py-2.5 pl-10 pr-3 text-sm font-semibold text-gold-400"
                  placeholder="e.g. admin or yogesh"
                  autoCapitalize="none"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input block w-full rounded-lg py-2.5 pl-10 pr-3 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg bg-gold-gradient px-4 py-3 text-sm font-bold text-black transition duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50 shadow-lg shadow-gold-500/10"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  "Access Workspace"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-400">New business? </span>
            <Link
              href="/register"
              className="font-medium text-gold-400 hover:text-gold-300 transition duration-150 underline font-bold"
            >
              Create a Business Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

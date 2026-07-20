"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, LogOut, CheckCircle, Bell, Shield, Info, DollarSign } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [success, setSuccess] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [taxRate, setTaxRate] = useState("18");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [lowStockAlert, setLowStockAlert] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("Settings saved successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          System <span className="text-gold-gradient">Settings</span>
        </h2>
        <p className="text-sm text-slate-400">Configure global rules, taxes, and session rules.</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 p-4 text-sm text-emerald-400">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Localization & Finance Rules */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <DollarSign size={18} className="text-gold-400" />
            Financial Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase">Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="glass-input mt-1.5 w-full rounded-lg px-3 py-2 text-sm bg-slate-950"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase">Standard GST Tax Rate (%)</label>
              <div className="flex mt-1.5 gap-3">
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="glass-input w-24 rounded-lg px-3 py-2 text-sm"
                  disabled={!taxEnabled}
                />
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-gold-500 accent-gold-500"
                  />
                  Enable GST on invoices
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications & System alerts */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Bell size={18} className="text-gold-400" />
            Alerts & Notifications
          </h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={lowStockAlert}
                onChange={(e) => setLowStockAlert(e.target.checked)}
                className="mt-1 rounded border-slate-700 bg-slate-950 text-gold-500 accent-gold-500"
              />
              <div>
                <p className="font-semibold text-white">Low Stock Warnings</p>
                <p className="text-xs text-slate-400">Trigger warnings in dashboard when raw items drop below threshold.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Support & SaaS Licensing */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield size={18} className="text-gold-400" />
            Security & Licensing
          </h3>
          <div className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <Info className="text-slate-500" size={20} />
              <div>
                <h5 className="font-semibold text-white text-sm">ERP Subscription</h5>
                <p className="text-xs text-slate-400 mt-0.5">SaaS multi-tenant license status</p>
              </div>
            </div>
            <span className="rounded-full bg-gold-950/60 border border-gold-500/30 px-3 py-1 text-xs font-semibold text-gold-400">
              Developer Sandbox Active
            </span>
          </div>
        </div>

        {/* Form Controls / Save and Logout */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-950/20 px-5 py-3 text-sm font-semibold text-red-400 hover:bg-red-950/30 transition"
          >
            <LogOut size={16} />
            Terminate Session (Logout)
          </button>

          <button
            type="submit"
            className="rounded-lg bg-gold-gradient px-6 py-3 text-sm font-bold text-black hover:brightness-110 transition"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}

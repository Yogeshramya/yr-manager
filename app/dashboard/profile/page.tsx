"use client";

import React, { useEffect, useState } from "react";
import {
  User,
  Building,
  Mail,
  MapPin,
  Percent,
  Loader2,
  CheckCircle,
  Lock,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Account details form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");

  // Password edit form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load profile");

        setName(data.user.name || "");
        setUsername(data.user.username || "");
        setEmail(data.user.email || "");
        setRole(data.user.role || "");

        if (data.user.businessId) {
          setBusinessName(data.user.businessId.name || "");
          setAddress(data.user.businessId.address || "");
          setGstin(data.user.businessId.gstin || "");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, businessName, address, gstin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      if (data.user) {
        setName(data.user.name || "");
        setUsername(data.user.username || "");
        setEmail(data.user.email || "");
        if (data.user.businessId) {
          setBusinessName(data.user.businessId.name || "");
          setAddress(data.user.businessId.address || "");
          setGstin(data.user.businessId.gstin || "");
        }
      }

      setMessage("Workspace details updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to save profile changes");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setPasswordMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Error updating password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          Business <span className="text-gold-gradient">Profile</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure business coordinates, account owner details, and security passwords.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/50 border border-red-500/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 p-4 text-sm text-emerald-400">
          <CheckCircle size={16} />
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="animate-spin text-gold-400" size={32} />
          <p className="text-sm">Retrieving profile...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Account & Business Details Form */}
          <form onSubmit={handleUpdate} className="space-y-6">
            {/* User Account Coordinates */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <User size={18} className="text-gold-400" />
                Account Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Contact Name</label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User size={16} className="text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="glass-input block w-full rounded-lg py-2 pl-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Login Username</label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User size={16} className="text-gold-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="glass-input block w-full rounded-lg py-2 pl-9 text-sm font-semibold text-gold-400"
                      placeholder="e.g. admin or yogesh"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Email Address</label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail size={16} className="text-slate-500" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input block w-full rounded-lg py-2 pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-xs font-semibold text-slate-400 uppercase">Account Authorization Role</span>
                <p className="mt-1.5 text-sm font-semibold text-gold-400 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 w-max">
                  {role || "Workspace Owner"}
                </p>
              </div>
            </div>

            {/* Business Specific Details */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Building size={18} className="text-gold-400" />
                Store / Business Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-4 md:space-y-0">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">Business Name</label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Building size={16} className="text-slate-500" />
                    </div>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="glass-input block w-full rounded-lg py-2 pl-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">GSTIN / Tax ID</label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Percent size={16} className="text-slate-500" />
                    </div>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="glass-input block w-full rounded-lg py-2 pl-9 text-sm"
                      placeholder="33AAAAA1111A1Z1"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase">Operating Address</label>
                <div className="relative mt-1.5">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MapPin size={16} className="text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="glass-input block w-full rounded-lg py-2 pl-9 text-sm"
                    placeholder="Street name, City, Pin Code"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-gold-gradient px-6 py-3 text-sm font-bold text-black hover:brightness-110 transition disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save Profile Details
              </button>
            </div>
          </form>

          {/* Password Edit Section */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <KeyRound size={18} className="text-gold-400" />
              <span>Password & Security Edit</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update your account password. Use at least 6 characters with a combination of letters and numbers.
            </p>

            {passwordError && (
              <div className="mb-4 rounded-lg bg-red-950/50 border border-red-500/30 p-3 text-xs text-red-400">
                {passwordError}
              </div>
            )}

            {passwordMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 p-3 text-xs text-emerald-400">
                <ShieldCheck size={16} />
                {passwordMessage}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">
                    Current Password*
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock size={16} className="text-slate-500" />
                    </div>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="glass-input block w-full rounded-lg py-2 pl-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">
                    New Password*
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <KeyRound size={16} className="text-slate-500" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="glass-input block w-full rounded-lg py-2 pl-9 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase">
                    Confirm New Password*
                  </label>
                  <div className="relative mt-1.5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <CheckCircle size={16} className="text-slate-500" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="glass-input block w-full rounded-lg py-2 pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 rounded-lg bg-gold-gradient px-6 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 transition disabled:opacity-50"
                >
                  {savingPassword ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

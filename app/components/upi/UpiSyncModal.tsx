"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  Smartphone,
  Sparkles,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface UpiSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  checklistItems?: Array<{ _id: string; title: string; type: string }>;
}

export default function UpiSyncModal({
  isOpen,
  onClose,
  onSuccess,
  checklistItems = [],
}: UpiSyncModalProps) {
  const [activeTab, setActiveTab] = useState<"smart" | "direct" | "qr">("smart");

  // Smart Parser states
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [upiApp, setUpiApp] = useState("Google Pay");
  const [utrNumber, setUtrNumber] = useState("");
  const [payerName, setPayerName] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedChecklistItem, setSelectedChecklistItem] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // UPI VPA setup states
  const [upiVpa, setUpiVpa] = useState("");
  const [updatingVpa, setUpdatingVpa] = useState(false);
  const [copied, setCopied] = useState(false);

  const UPI_APPS = [
    { name: "Google Pay", color: "from-blue-500 to-emerald-500", icon: "GPay" },
    { name: "PhonePe", color: "from-purple-600 to-indigo-600", icon: "PhonePe" },
    { name: "Paytm", color: "from-cyan-500 to-blue-600", icon: "Paytm" },
    { name: "BHIM", color: "from-amber-500 to-orange-600", icon: "BHIM" },
    { name: "Cred", color: "from-slate-800 to-slate-950", icon: "Cred" },
    { name: "Amazon Pay", color: "from-amber-600 to-yellow-500", icon: "Amazon" },
  ];

  // Load existing UPI VPA ID
  useEffect(() => {
    if (isOpen) {
      fetch("/api/upi")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.upiVpa) {
            setUpiVpa(data.upiVpa);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Smart SMS text parser function
  const handleParseText = async (textToParse: string) => {
    if (!textToParse.trim()) return;
    setParsing(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", rawText: textToParse }),
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        const { amount: pAmount, utr: pUtr, payerName: pName, appName: pApp } = data.parsed;
        if (pAmount) setAmount(pAmount.toString());
        if (pUtr) setUtrNumber(pUtr);
        if (pName) setPayerName(pName);
        if (pApp) setUpiApp(pApp);

        setSuccessMsg("Smart auto-extracted transaction details!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  // Submit UPI transaction log
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          upiApp,
          utrNumber,
          payerName,
          notes,
          checklistItemId: selectedChecklistItem || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || "Logged UPI transaction successfully!");
        setTimeout(() => {
          setSuccessMsg("");
          onClose();
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        setErrorMsg(data.error || "Failed to log UPI transaction");
      }
    } catch (err) {
      setErrorMsg("Network error saving transaction");
    } finally {
      setSubmitting(false);
    }
  };

  // Save UPI VPA Settings
  const handleSaveVpa = async () => {
    if (!upiVpa.trim()) return;
    setUpdatingVpa(true);
    try {
      const res = await fetch("/api/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateVpa", upiVpa }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("UPI VPA ID saved!");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingVpa(false);
    }
  };

  // Dynamic QR Code payload URL
  const qrAmountParam = amount && !isNaN(Number(amount)) ? `&am=${amount}` : "";
  const upiQrPayload = `upi://pay?pa=${encodeURIComponent(upiVpa || "merchant@upi")}&pn=YRManagerMerchant&cu=INR${qrAmountParam}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiQrPayload)}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-2xl rounded-2xl p-6 border border-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition p-1 rounded-lg"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Smartphone size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <span>UPI Apps</span>
              <span className="text-gold-gradient">Integration</span>
            </h3>
            <p className="text-xs text-slate-400">
              Sync GPay, PhonePe, Paytm, BHIM & bank SMS payments directly into your live records.
            </p>
          </div>
        </div>

        {/* Toast / Message banner */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 p-3.5 text-emerald-400 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-rose-950/90 border border-rose-500/40 p-3.5 text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1 mb-6">
          <button
            onClick={() => setActiveTab("smart")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "smart"
                ? "bg-gold-gradient text-slate-950 font-black shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles size={14} />
            <span>Smart SMS Parser</span>
          </button>

          <button
            onClick={() => setActiveTab("direct")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "direct"
                ? "bg-gold-gradient text-slate-950 font-black shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap size={14} />
            <span>Quick UPI Record</span>
          </button>

          <button
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === "qr"
                ? "bg-gold-gradient text-slate-950 font-black shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <QrCode size={14} />
            <span>UPI QR Code & VPA</span>
          </button>
        </div>

        {/* Tab 1: Smart SMS Text Auto-Parser */}
        {activeTab === "smart" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                <Sparkles className="text-gold-400" size={14} />
                <span>Paste SMS Notification / GPay / PhonePe Text</span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  handleParseText(e.target.value);
                }}
                placeholder="Paste message like: 'Rs 1,200.00 credited to a/c XX1234 on 20-07-26 by UPI/420198765432/GPay/Rajesh Kumar'"
                className="glass-input w-full rounded-xl px-4 py-3 text-xs h-24 resize-none"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                💡 Automatically extracts Amount, Payer Name, 12-digit UTR Ref No, and UPI App!
              </p>
            </div>

            {/* Extracted Form Inputs */}
            <form onSubmit={handleSubmitTransaction} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Amount (INR)*
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1200"
                    className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-base font-bold text-gold-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    UPI Application
                  </label>
                  <select
                    value={upiApp}
                    onChange={(e) => setUpiApp(e.target.value)}
                    className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-xs bg-slate-950 text-slate-200"
                  >
                    {UPI_APPS.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Payer / Customer Name
                  </label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    UTR / Reference Number (12 Digits)
                  </label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. 420198765432"
                    className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              {checklistItems.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Link to Daily Checklist Title (Optional)
                  </label>
                  <select
                    value={selectedChecklistItem}
                    onChange={(e) => setSelectedChecklistItem(e.target.value)}
                    className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-xs bg-slate-950 text-slate-200"
                  >
                    <option value="">Do not link (Log to Income Report only)</option>
                    {checklistItems
                      .filter((i) => i.type === "Income")
                      .map((i) => (
                        <option key={i._id} value={i._id}>
                          📌 {i.title}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={18} />}
                Confirm & Log UPI Transaction
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Direct UPI Entry */}
        {activeTab === "direct" && (
          <form onSubmit={handleSubmitTransaction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Select Payment UPI App
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {UPI_APPS.map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => setUpiApp(app.name)}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      upiApp === app.name
                        ? "border-gold-500 bg-gold-950/40 text-gold-400 font-bold shadow-lg"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="text-[11px] font-black">{app.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Amount (INR)*
                </label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 500, 2500"
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-3 text-lg font-bold text-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Customer / Payer Name
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="e.g. Suresh Kumar"
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-3 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  12-Digit UTR / Ref No
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 420987654321"
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Notes / Item Description
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Counter QR payment"
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-50 mt-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={18} />}
              Log {upiApp} Payment
            </button>
          </form>
        )}

        {/* Tab 3: UPI QR Code & VPA Setup */}
        {activeTab === "qr" && (
          <div className="space-y-6">
            {/* VPA Setup Card */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Your Merchant UPI VPA / ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  placeholder="e.g. yrmanager@okaxis, 9876543210@paytm"
                  className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm font-mono text-gold-400"
                />
                <button
                  onClick={handleSaveVpa}
                  disabled={updatingVpa}
                  className="px-4 py-2.5 rounded-xl bg-gold-gradient text-slate-950 font-bold text-xs hover:brightness-110 transition shrink-0"
                >
                  {updatingVpa ? "Saving..." : "Save VPA"}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Scan with Google Pay, PhonePe, Paytm, or BHIM app to pay instantly.
              </p>
            </div>

            {/* Dynamic Live QR Code Display */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="p-3 bg-white rounded-2xl shadow-xl mb-4">
                <img
                  src={qrImageUrl}
                  alt="UPI Payment QR Code"
                  className="w-48 h-48 object-contain"
                />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm font-bold text-slate-200">
                  {upiVpa || "Set your UPI ID above"}
                </span>
                {upiVpa && (
                  <button
                    onClick={() => copyToClipboard(upiVpa)}
                    className="text-slate-400 hover:text-gold-400 p-1"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 mt-2">
                {UPI_APPS.slice(0, 4).map((a) => (
                  <span
                    key={a.name}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-bold"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

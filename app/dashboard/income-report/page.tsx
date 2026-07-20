"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Search,
  Filter,
  Download,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Loader2,
  X,
  CreditCard,
  Wallet,
  Building2,
  ArrowUpRight,
  Info,
  Trash2,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import UpiSyncModal from "@/app/components/upi/UpiSyncModal";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface IncomeRecord {
  _id: string;
  source: string;
  title: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentStatus: "Paid" | "Pending" | "Partial" | string;
  paymentMethod: string;
  date: string;
  notes: string;
}

interface SummaryData {
  totalIncome: number;
  paidIncome: number;
  pendingIncome: number;
  totalCount: number;
  averageIncome: number;
}

interface MethodBreakdown {
  name: string;
  amount: number;
  percentage: number;
}

interface CustomerOption {
  _id: string;
  name: string;
}

const COLORS = ["#10b981", "#3b82f6", "#dcc522", "#8b5cf6", "#f97316", "#06b6d4"];

export default function IncomeReportPage() {
  const [range, setRange] = useState<"today" | "week" | "month" | "all">("month");
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalIncome: 0,
    paidIncome: 0,
    pendingIncome: 0,
    totalCount: 0,
    averageIncome: 0,
  });
  const [methodBreakdown, setMethodBreakdown] = useState<MethodBreakdown[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [checklistItems, setChecklistItems] = useState<{ _id: string; title: string }[]>([]);
  const [selectedChecklistItemId, setSelectedChecklistItemId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Paid" | "Pending">("ALL");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [newInvoiceNo, setNewInvoiceNo] = useState("");
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newStatus, setNewStatus] = useState<"Paid" | "Pending">("Paid");
  const [newMethod, setNewMethod] = useState<"UPI" | "Cash" | "Bank Transfer" | "Card">("UPI");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchIncomeReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/income?range=${range}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setSummary(data.summary);
        setMethodBreakdown(data.methodBreakdown);
        setCustomers(data.customers || []);
        setChecklistItems(data.checklistItems || []);
      } else {
        setErrorMsg(data.error || "Failed to load income report");
      }
    } catch (err) {
      setErrorMsg("Network error loading income report");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchIncomeReport();
  }, [fetchIncomeReport]);

  // Format Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Filtered records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.notes.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || r.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Handle Add New Income Submit
  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || isNaN(Number(newAmount))) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/reports/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistItemId: selectedChecklistItemId || undefined,
          invoiceNumber: newInvoiceNo,
          customerId: newCustomerId || undefined,
          amount: Number(newAmount),
          paymentStatus: newStatus,
          paymentMethod: newMethod,
          date: newDate,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Income record saved successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
        setModalOpen(false);
        setNewAmount("");
        setNewNotes("");
        setNewInvoiceNo("");
        setSelectedChecklistItemId("");
        fetchIncomeReport();
      } else {
        setErrorMsg(data.error || "Failed to save income record");
      }
    } catch (err) {
      setErrorMsg("Network error saving income");
    } finally {
      setSaving(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ["Date", "Invoice #", "Title / Note", "Customer", "Source", "Method", "Status", "Amount (INR)"];
    const rows = filteredRecords.map((r) => [
      new Date(r.date).toLocaleDateString(),
      `"${r.invoiceNumber}"`,
      `"${r.title}"`,
      `"${r.customerName}"`,
      `"${r.source}"`,
      `"${r.paymentMethod}"`,
      `"${r.paymentStatus}"`,
      r.amount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Income_Report_${range}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart data aggregation for time range
  const chartData = filteredRecords
    .slice()
    .reverse()
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: r.amount,
    }));

  // Delete single record
  const handleDeleteRecord = async (id: string, source: string) => {
    if (!confirm("Are you sure you want to delete this income record?")) return;
    try {
      const res = await fetch(`/api/reports/income?id=${id}&source=${encodeURIComponent(source)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Income record deleted");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchIncomeReport();
      } else {
        setErrorMsg(data.error || "Failed to delete record");
      }
    } catch (err) {
      setErrorMsg("Error deleting record");
    }
  };

  // Clear all sample seed records
  const handleClearMock = async () => {
    if (!confirm("This will purge all sample seeded income records and display ONLY your real-time live checklist & custom records. Proceed?")) return;
    try {
      const res = await fetch("/api/reports/income?clearMock=true", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Cleared sample records! Showing real-time live data only.");
        setTimeout(() => setSuccessMsg(""), 4000);
        fetchIncomeReport();
      } else {
        setErrorMsg(data.error || "Failed to clear sample records");
      }
    } catch (err) {
      setErrorMsg("Error clearing sample records");
    }
  };

  // Reset all records to ZERO
  const handleResetAllToZero = async () => {
    if (!confirm("CRITICAL WARNING: This will permanently delete ALL old Income, Expense, and Checklist Log records and reset your data to ZERO. Are you sure you want to start from ZERO?")) return;
    try {
      const res = await fetch("/api/reports/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("All old records deleted! Data reset to ZERO.");
        setTimeout(() => setSuccessMsg(""), 4000);
        fetchIncomeReport();
      } else {
        setErrorMsg(data.error || "Failed to reset data");
      }
    } catch (err) {
      setErrorMsg("Error resetting data to ZERO");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Toast notifications */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 p-4 text-emerald-400 shadow-xl backdrop-blur-md animate-bounce">
          <CheckCircle2 size={18} />
          <span className="font-semibold text-sm">{successMsg}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Income <span className="text-gold-gradient">Report</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Track revenue inflows, customer invoice receipts, UPI, and daily operations income.
          </p>
        </div>

        {/* Range Tabs & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
            {(["today", "week", "month", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                  range === r
                    ? "bg-gold-gradient text-slate-950 font-black shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r === "today" ? "Today" : r === "week" ? "7 Days" : r === "month" ? "30 Days" : "All Time"}
              </button>
            ))}
          </div>

          <button
            onClick={handleResetAllToZero}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-red-500/30 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-white text-xs font-bold transition shadow-lg shadow-red-950/20"
            title="Delete ALL old records and start from ZERO"
          >
            <RotateCcw size={14} />
            <span>Reset All to ZERO</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 text-xs font-semibold transition"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setUpiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-950/40 text-blue-400 hover:bg-blue-900/60 hover:text-white text-xs font-bold transition shadow-lg shadow-blue-950/20"
          >
            <Smartphone size={15} />
            <span>Sync UPI Apps</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-gradient text-slate-950 text-xs font-bold transition hover:brightness-110"
          >
            <Plus size={16} />
            <span>Record Income</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Income */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/30 p-3.5 text-emerald-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Income</p>
              <h4 className="mt-1 text-2xl font-black text-white">{formatCurrency(summary.totalIncome)}</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">{summary.totalCount} records found</p>
            </div>
          </div>
        </div>

        {/* Received / Paid */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-950/50 border border-blue-500/30 p-3.5 text-blue-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paid Receipts</p>
              <h4 className="mt-1 text-2xl font-black text-emerald-400">{formatCurrency(summary.paidIncome)}</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Cleared payments</p>
            </div>
          </div>
        </div>

        {/* Pending Dues */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-amber-950/50 border border-amber-500/30 p-3.5 text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Dues</p>
              <h4 className="mt-1 text-2xl font-black text-amber-400">{formatCurrency(summary.pendingIncome)}</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Outstanding collections</p>
            </div>
          </div>
        </div>

        {/* Average Transaction */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-purple-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-purple-950/50 border border-purple-500/30 p-3.5 text-purple-400">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Transaction</p>
              <h4 className="mt-1 text-2xl font-black text-white">{formatCurrency(summary.averageIncome)}</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Per invoice / entry</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Income Inflow Trend Chart */}
        <div className="glass-card lg:col-span-2 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              <span>Income Timeline Trend</span>
            </h3>
            <span className="text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full capitalize">
              Range: {range}
            </span>
          </div>

          <div className="h-72 w-full mt-4">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Info size={28} className="mb-2" />
                <p className="text-sm font-semibold">No income data available for this range</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#131b2e",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "Income"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#incomeTrend)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Method Breakdown Pie */}
        <div className="glass-card lg:col-span-1 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-blue-400" />
              <span>Payment Methods</span>
            </h3>

            {methodBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-12">
                <Info size={24} className="mb-2" />
                <p className="text-xs font-semibold">No payment breakdown available</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-44 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={methodBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="amount"
                      >
                        {methodBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Total"]}
                        contentStyle={{
                          backgroundColor: "#131b2e",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {methodBreakdown.map((m, idx) => (
                    <div key={m.name} className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-slate-300">{m.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-bold">{formatCurrency(m.amount)}</span>
                        <span className="text-slate-500 ml-1 font-normal">({m.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Filters & Records Table */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-gold-400" />
            <span>Income Transactions ({filteredRecords.length})</span>
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search invoice, customer or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full rounded-xl pl-10 pr-4 py-2 text-xs"
              />
            </div>

            {/* Status Filter buttons */}
            <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
              {(["ALL", "Paid", "Pending"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    statusFilter === st
                      ? "bg-slate-800 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Title / Description</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Loader2 className="animate-spin inline-block mr-2" size={18} />
                    Loading income records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No matching income records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-950/50 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gold-400">{r.invoiceNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-white max-w-[200px] truncate">{r.title}</td>
                    <td className="py-3.5 px-4 text-slate-300">{r.customerName}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 border border-slate-800 text-slate-400">
                        {r.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">{r.paymentMethod}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          r.paymentStatus === "Paid"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-950/60 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {r.paymentStatus === "Paid" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {r.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-400 text-sm">
                      {formatCurrency(r.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteRecord(r._id, r.source)}
                        className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-slate-900 rounded-lg transition"
                        title="Delete record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Income Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-400" />
              <span>Record New Income</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">Enter payment receipt or income transaction details.</p>

            <form onSubmit={handleSaveIncome} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Income Amount (INR)*
                </label>
                <input
                  type="number"
                  step="any"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="glass-input w-full rounded-xl px-4 py-3 text-lg font-bold"
                  required
                  autoFocus
                />
              </div>

              {checklistItems.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Select Daily Checklist Item (Optional)
                  </label>
                  <select
                    value={selectedChecklistItemId}
                    onChange={(e) => setSelectedChecklistItemId(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs bg-slate-950 text-gold-400 font-bold border-gold-500/30"
                  >
                    <option value="" className="text-white font-normal">-- Direct Invoice / Custom Income --</option>
                    {checklistItems.map((item) => (
                      <option key={item._id} value={item._id} className="text-white font-bold">
                        📋 Checklist: {item.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Invoice # (Optional)
                  </label>
                  <input
                    type="text"
                    value={newInvoiceNo}
                    onChange={(e) => setNewInvoiceNo(e.target.value)}
                    placeholder="INV-1001"
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Customer (Optional)
                </label>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs bg-slate-950 text-white"
                >
                  <option value="">Direct / Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value as any)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs bg-slate-950 text-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Payment Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs bg-slate-950 text-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Notes / Title
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Service fee, print job, design work..."
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-xs font-extrabold text-slate-950 hover:brightness-110 transition disabled:opacity-50 mt-4"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Save Income Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* UPI Apps Integration Modal */}
      <UpiSyncModal
        isOpen={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        onSuccess={fetchIncomeReport}
        checklistItems={checklistItems.map(c => ({ _id: c._id, title: c.title, type: "Income" }))}
      />
    </div>
  );
}

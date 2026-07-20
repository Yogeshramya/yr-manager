"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingDown,
  Search,
  Download,
  Plus,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Loader2,
  X,
  Building2,
  PieChart as PieIcon,
  ShoppingBag,
  Info,
  CheckCircle2,
  Trash2,
  RotateCcw,
} from "lucide-react";
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

interface ExpenseRecord {
  _id: string;
  source: string;
  category: string;
  supplierName: string;
  amount: number;
  date: string;
  notes: string;
}

interface SummaryData {
  totalExpense: number;
  topCategory: string;
  totalCount: number;
  averageExpense: number;
}

interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
}

interface SupplierOption {
  _id: string;
  name: string;
}

const CATEGORIES = [
  "Rent",
  "Electricity",
  "Internet",
  "Salary",
  "Fuel",
  "Ink",
  "Paper",
  "Packing",
  "Courier",
  "Machine Maintenance",
  "Marketing",
  "Other",
];

const COLORS = ["#ef4444", "#f97316", "#dcc522", "#3b82f6", "#8b5cf6", "#10b981", "#06b6d4"];

export default function ExpenseReportPage() {
  const [range, setRange] = useState<"today" | "week" | "month" | "all">("month");
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalExpense: 0,
    topCategory: "N/A",
    totalCount: 0,
    averageExpense: 0,
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [checklistItems, setChecklistItems] = useState<{ _id: string; title: string }[]>([]);
  const [selectedChecklistItemId, setSelectedChecklistItemId] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<string>("Rent");
  const [newSupplierId, setNewSupplierId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchExpenseReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/expense?range=${range}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setSummary(data.summary);
        setCategoryBreakdown(data.categoryBreakdown);
        setSuppliers(data.suppliers || []);
        setChecklistItems(data.checklistItems || []);
      } else {
        setErrorMsg(data.error || "Failed to load expense report");
      }
    } catch (err) {
      setErrorMsg("Network error loading expense report");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchExpenseReport();
  }, [fetchExpenseReport]);

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
      r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.notes.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || r.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Handle Add New Expense Submit
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || isNaN(Number(newAmount))) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/reports/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistItemId: selectedChecklistItemId || undefined,
          category: newCategory,
          supplierId: newSupplierId || undefined,
          amount: Number(newAmount),
          date: newDate,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Expense record saved successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
        setModalOpen(false);
        setNewAmount("");
        setNewNotes("");
        setSelectedChecklistItemId("");
        fetchExpenseReport();
      } else {
        setErrorMsg(data.error || "Failed to save expense record");
      }
    } catch (err) {
      setErrorMsg("Network error saving expense");
    } finally {
      setSaving(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = ["Date", "Category", "Supplier / Payee", "Source", "Notes", "Amount (INR)"];
    const rows = filteredRecords.map((r) => [
      new Date(r.date).toLocaleDateString(),
      `"${r.category}"`,
      `"${r.supplierName}"`,
      `"${r.source}"`,
      `"${r.notes}"`,
      r.amount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Expense_Report_${range}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart data aggregation
  const chartData = filteredRecords
    .slice()
    .reverse()
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: r.amount,
    }));

  // Delete single record
  const handleDeleteRecord = async (id: string, source: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      const res = await fetch(`/api/reports/expense?id=${id}&source=${encodeURIComponent(source)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Expense record deleted");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchExpenseReport();
      } else {
        setErrorMsg(data.error || "Failed to delete record");
      }
    } catch (err) {
      setErrorMsg("Error deleting record");
    }
  };

  // Clear all sample seed records
  const handleClearMock = async () => {
    if (!confirm("This will purge all sample seeded expense records and display ONLY your real-time live checklist & custom records. Proceed?")) return;
    try {
      const res = await fetch("/api/reports/expense?clearMock=true", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Cleared sample records! Showing real-time live data only.");
        setTimeout(() => setSuccessMsg(""), 4000);
        fetchExpenseReport();
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
        fetchExpenseReport();
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
            Expense <span className="text-gold-gradient">Report</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Review overhead costs, vendor payments, materials purchases, and daily operational expenditures.
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
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-950/40"
          >
            <Plus size={16} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Expense */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-red-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-red-950/50 border border-red-500/30 p-3.5 text-red-400">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Expenses</p>
              <h4 className="mt-1 text-2xl font-black text-white">{formatCurrency(summary.totalExpense)}</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">{summary.totalCount} records found</p>
            </div>
          </div>
        </div>

        {/* Highest Category */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-orange-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-orange-950/50 border border-orange-500/30 p-3.5 text-orange-400">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Top Expense Category</p>
              <h4 className="mt-1 text-xl font-black text-orange-400 truncate max-w-[150px]">{summary.topCategory}</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Largest cost driver</p>
            </div>
          </div>
        </div>

        {/* Transaction Count */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-950/50 border border-blue-500/30 p-3.5 text-blue-400">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expense Logs</p>
              <h4 className="mt-1 text-2xl font-black text-white">{summary.totalCount} Entries</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Logged expenses</p>
            </div>
          </div>
        </div>

        {/* Average Expense */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-purple-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-purple-950/50 border border-purple-500/30 p-3.5 text-purple-400">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Expense Log</p>
              <h4 className="mt-1 text-2xl font-black text-white">{formatCurrency(summary.averageExpense)}</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Per entry / invoice</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Expense Timeline Area Chart */}
        <div className="glass-card lg:col-span-2 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingDown size={18} className="text-red-400" />
              <span>Expense Expenditure Trend</span>
            </h3>
            <span className="text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full capitalize">
              Range: {range}
            </span>
          </div>

          <div className="h-72 w-full mt-4">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Info size={28} className="mb-2" />
                <p className="text-sm font-semibold">No expense data available for this range</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="expenseTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                    formatter={(value) => [formatCurrency(Number(value)), "Expense"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#expenseTrend)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Pie & Progress Bars */}
        <div className="glass-card lg:col-span-1 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <PieIcon size={18} className="text-orange-400" />
              <span>Category Share</span>
            </h3>

            {categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-500 py-12">
                <Info size={24} className="mb-2" />
                <p className="text-xs font-semibold">No category breakdown available</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-44 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="amount"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Spent"]}
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

                <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                  {categoryBreakdown.map((c, idx) => (
                    <div key={c.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-slate-300">{c.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-bold">{formatCurrency(c.amount)}</span>
                          <span className="text-slate-500 ml-1 font-normal">({c.percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                            width: `${c.percentage}%`,
                          }}
                        />
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
            <FileSpreadsheet size={18} className="text-red-400" />
            <span>Expense Transactions ({filteredRecords.length})</span>
          </h3>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search category, supplier or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full rounded-xl pl-10 pr-4 py-2 text-xs"
              />
            </div>

            {/* Category Selector Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="glass-input rounded-xl px-3 py-2 text-xs bg-slate-950 text-slate-200"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Supplier / Payee</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Notes / Details</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Loader2 className="animate-spin inline-block mr-2" size={18} />
                    Loading expense records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No matching expense records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-950/50 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-400">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-500/20">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">{r.supplierName}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 border border-slate-800 text-slate-400">
                        {r.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-[250px] truncate">{r.notes || "-"}</td>
                    <td className="py-3.5 px-4 text-right font-black text-red-400 text-sm">
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

      {/* Record Expense Modal */}
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
              <TrendingDown size={20} className="text-red-400" />
              <span>Record New Expense</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">Log vendor payment or overhead expenditure.</p>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Expense Amount (INR)*
                </label>
                <input
                  type="number"
                  step="any"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 1500"
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
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs bg-slate-950 text-red-400 font-bold border-red-500/30"
                  >
                    <option value="" className="text-white font-normal">-- Direct Expense / Formal Category --</option>
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
                    Category*
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs bg-slate-950 text-white"
                    required
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
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
                  Supplier / Payee (Optional)
                </label>
                <select
                  value={newSupplierId}
                  onChange={(e) => setNewSupplierId(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs bg-slate-950 text-white"
                >
                  <option value="">Direct Expense / No Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Description / Notes
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Payment details, bill number, paper specs..."
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 py-3 text-xs font-extrabold text-white transition disabled:opacity-50 mt-4 shadow-lg shadow-red-950/40"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Save Expense Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

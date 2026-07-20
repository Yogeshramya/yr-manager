"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  CheckCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  Info,
  AlertCircle,
  X,
  Edit,
  Loader2,
  Check,
  Wallet,
  Clock,
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
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface ChecklistItemType {
  _id: string;
  title: string;
  type: "Income" | "Expense";
  active: boolean;
}

interface ChecklistLogType {
  _id: string;
  checklistItemId: ChecklistItemType | string;
  amount: number;
  date: string;
  notes?: string;
}

interface PendingPaymentType {
  _id: string;
  title: string;
  amount: number;
  description: string;
  customerName?: string;
  status: string;
  date: string;
}

interface ChecklistDashboardProps {
  initialItems: ChecklistItemType[];
  initialTodayLogs: ChecklistLogType[];
  initialAllLogs?: ChecklistLogType[];
  initialPendingPayments?: PendingPaymentType[];
  businessCurrency: string;
}

const PIE_COLORS = ["#dcc522", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#f97316", "#06b6d4"];

export default function ChecklistDashboard({
  initialItems,
  initialTodayLogs,
  initialAllLogs = [],
  initialPendingPayments = [],
  businessCurrency = "INR",
}: ChecklistDashboardProps) {
  // Format today's date local string
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [items, setItems] = useState<ChecklistItemType[]>(initialItems);
  const [todayLogs, setTodayLogs] = useState<ChecklistLogType[]>(initialTodayLogs);
  const [allLogs, setAllLogs] = useState<ChecklistLogType[]>(initialAllLogs);
  const [weeklyLogs, setWeeklyLogs] = useState<ChecklistLogType[]>([]);
  const [monthlyLogs, setMonthlyLogs] = useState<ChecklistLogType[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentType[]>(initialPendingPayments);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal for Pending Payment
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [viewPendingListOpen, setViewPendingListOpen] = useState(false);
  const [pendingTitle, setPendingTitle] = useState("");
  const [pendingAmount, setPendingAmount] = useState("");
  const [pendingDescription, setPendingDescription] = useState("");
  const [pendingDate, setPendingDate] = useState(getTodayString());
  const [savingPending, setSavingPending] = useState(false);

  // Modal for logging amount
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedItemForLog, setSelectedItemForLog] = useState<ChecklistItemType | null>(null);
  const [logAmount, setLogAmount] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [savingLog, setSavingLog] = useState(false);

  // Modal / Section for managing titles
  const [configOpen, setConfigOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"Income" | "Expense">("Expense");
  const [savingConfig, setSavingConfig] = useState(false);

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: businessCurrency,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Fetch checklist logs for selectedDate, week, and month
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch logs for selected date
      const resToday = await fetch(`/api/checklist-logs?date=${selectedDate}`);
      const dataToday = await resToday.json();
      if (dataToday.success) {
        setTodayLogs(dataToday.logs);
      }

      // 2. Fetch logs for past week
      const resWeek = await fetch("/api/checklist-logs?range=week");
      const dataWeek = await resWeek.json();
      if (dataWeek.success) {
        setWeeklyLogs(dataWeek.logs);
      }

      // 3. Fetch logs for past month
      const resMonth = await fetch("/api/checklist-logs?range=month");
      const dataMonth = await resMonth.json();
      if (dataMonth.success) {
        setMonthlyLogs(dataMonth.logs);
      }

      // 4. Fetch all logs for past reports & cumulative balance calculation
      const resAll = await fetch("/api/checklist-logs?range=all");
      const dataAll = await resAll.json();
      if (dataAll.success) {
        setAllLogs(dataAll.logs);
      }

      // 5. Fetch pending payments
      const resPending = await fetch("/api/pending-payments");
      const dataPending = await resPending.json();
      if (dataPending.success) {
        setPendingPayments(dataPending.pendingPayments);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setErrorMsg("Failed to fetch logs from server");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Handle saving new pending payment
  const handleSavePendingPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTitle.trim() || !pendingAmount || isNaN(Number(pendingAmount))) return;

    setSavingPending(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/pending-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pendingTitle,
          amount: Number(pendingAmount),
          description: pendingDescription,
          date: pendingDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Pending payment for "${pendingTitle}" recorded`);
        setTimeout(() => setSuccessMsg(""), 3000);
        setPendingModalOpen(false);
        setPendingTitle("");
        setPendingAmount("");
        setPendingDescription("");
        fetchAllData();
      } else {
        setErrorMsg(data.error || "Failed to save pending payment");
      }
    } catch (err) {
      setErrorMsg("Network error saving pending payment");
    } finally {
      setSavingPending(false);
    }
  };

  // Mark pending payment as collected
  const handleMarkCollected = async (id: string, title: string) => {
    try {
      const res = await fetch("/api/pending-payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "Collected" }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Marked "${title}" as Collected!`);
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchAllData();
      } else {
        setErrorMsg(data.error || "Failed to mark payment as collected");
      }
    } catch (err) {
      setErrorMsg("Error marking payment as collected");
    }
  };

  // Delete pending payment
  const handleDeletePendingPayment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pending payment entry?")) return;
    try {
      const res = await fetch(`/api/pending-payments?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Pending payment entry deleted");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchAllData();
      } else {
        setErrorMsg(data.error || "Failed to delete pending payment");
      }
    } catch (err) {
      setErrorMsg("Error deleting pending payment");
    }
  };

  // Fetch checklist items configuration
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/checklist-items");
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  };

  // Trigger load on selectedDate change
  useEffect(() => {
    fetchAllData();
  }, [selectedDate, fetchAllData]);

  // Handle saving log entry
  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForLog || !logAmount) return;

    setSavingLog(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/checklist-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistItemId: selectedItemForLog._id,
          amount: Number(logAmount),
          dateInput: selectedDate,
          notes: logNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Successfully saved ${selectedItemForLog.title}`);
        setTimeout(() => setSuccessMsg(""), 3000);
        setLogModalOpen(false);
        setLogAmount("");
        setLogNotes("");
        setSelectedItemForLog(null);
        // Refresh charts and checklist state
        fetchAllData();
      } else {
        setErrorMsg(data.error || "Failed to save checklist entry");
      }
    } catch (err) {
      setErrorMsg("Network error saving entry");
    } finally {
      setSavingLog(false);
    }
  };

  // Handle deleting log entry (unchecking)
  const handleDeleteLog = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this daily data entry? This will uncheck the item.")) return;

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/checklist-logs?checklistItemId=${itemId}&date=${selectedDate}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Checklist entry removed");
        setTimeout(() => setSuccessMsg(""), 3000);
        setLogModalOpen(false);
        fetchAllData();
      } else {
        setErrorMsg(data.error || "Failed to remove entry");
      }
    } catch (err) {
      setErrorMsg("Network error removing entry");
    } finally {
      setLoading(false);
    }
  };

  // Handle adding custom checklist item title
  const handleAddConfigItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSavingConfig(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/checklist-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, type: newType }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTitle("");
        fetchItems();
        setSuccessMsg("Checklist title added successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(data.error || "Failed to add checklist item");
      }
    } catch (err) {
      setErrorMsg("Network error adding checklist item");
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle deleting custom checklist item title
  const handleDeleteConfigItem = async (id: string) => {
    if (!confirm("Deactivating this checklist item will hide it from the daily checklist. Existing logged reports will be preserved. Proceed?")) return;

    setErrorMsg("");
    try {
      const res = await fetch(`/api/checklist-items?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchItems();
        setSuccessMsg("Checklist title removed");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(data.error || "Failed to delete checklist item");
      }
    } catch (err) {
      setErrorMsg("Network error deleting item");
    }
  };

  // Open logging modal for item
  const openLogModal = (item: ChecklistItemType) => {
    setSelectedItemForLog(item);
    // Pre-fill amount/notes if already logged
    const existingLog = todayLogs.find((log) => {
      const itemId = log.checklistItemId && typeof log.checklistItemId === "object" ? log.checklistItemId._id : log.checklistItemId;
      return itemId === item._id;
    });

    if (existingLog) {
      setLogAmount(String(existingLog.amount));
      setLogNotes(existingLog.notes || "");
    } else {
      setLogAmount("");
      setLogNotes("");
    }
    setLogModalOpen(true);
  };

  // Date manipulation helpers
  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Process today's summary stats
  const todayIncomesTotal = todayLogs
    .filter((log) => {
      const item = log.checklistItemId && typeof log.checklistItemId === "object" ? log.checklistItemId : items.find(i => i._id === log.checklistItemId);
      return item?.type === "Income";
    })
    .reduce((sum, log) => sum + log.amount, 0);

  const todayExpensesTotal = todayLogs
    .filter((log) => {
      const item = log.checklistItemId && typeof log.checklistItemId === "object" ? log.checklistItemId : items.find(i => i._id === log.checklistItemId);
      return item?.type === "Expense";
    })
    .reduce((sum, log) => sum + log.amount, 0);

  const todayProfit = todayIncomesTotal - todayExpensesTotal;

  // Process past report cumulative balance (logs prior to selected date)
  const selectedDateParts = selectedDate.split("-");
  const selectedDateStart = selectedDateParts.length === 3
    ? new Date(parseInt(selectedDateParts[0]), parseInt(selectedDateParts[1]) - 1, parseInt(selectedDateParts[2]), 0, 0, 0, 0).getTime()
    : new Date(selectedDate).getTime();

  const pastReportsBalance = allLogs
    .filter((log) => {
      const logDateObj = new Date(log.date);
      const logDateStart = new Date(logDateObj.getFullYear(), logDateObj.getMonth(), logDateObj.getDate(), 0, 0, 0, 0).getTime();
      return logDateStart < selectedDateStart;
    })
    .reduce((sum, log) => {
      const item = log.checklistItemId && typeof log.checklistItemId === "object" ? log.checklistItemId : items.find(i => i._id === log.checklistItemId);
      if (!item) return sum;
      return sum + (item.type === "Income" ? log.amount : -log.amount);
    }, 0);

  const todayCurrentBalance = pastReportsBalance + todayProfit;

  // Process pending payments total
  const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  // Process weekly chart data (last 7 days)
  const getWeeklyChartData = () => {
    const dailyMap: { [key: string]: { date: string; income: number; expense: number; profit: number } } = {};
    const today = new Date();
    
    // Initialize last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dailyMap[dateKey] = { date: label, income: 0, expense: 0, profit: 0 };
    }

    weeklyLogs.forEach((log) => {
      // Normalize log.date format to YYYY-MM-DD
      const logDateObj = new Date(log.date);
      const logDateStr = `${logDateObj.getFullYear()}-${String(logDateObj.getMonth() + 1).padStart(2, "0")}-${String(logDateObj.getDate()).padStart(2, "0")}`;

      if (dailyMap[logDateStr]) {
        const item = log.checklistItemId && typeof log.checklistItemId === "object" ? log.checklistItemId : items.find(i => i._id === log.checklistItemId);
        if (item) {
          if (item.type === "Income") {
            dailyMap[logDateStr].income += log.amount;
          } else {
            dailyMap[logDateStr].expense += log.amount;
          }
          dailyMap[logDateStr].profit = dailyMap[logDateStr].income - dailyMap[logDateStr].expense;
        }
      }
    });

    return Object.keys(dailyMap).sort().map(key => dailyMap[key]);
  };

  const trendData = getWeeklyChartData();

  // Process monthly expense pie chart & breakdown (last 30 days)
  const getMonthlyExpenseData = () => {
    const expenseByCategory: { [key: string]: number } = {};
    let totalExpense = 0;

    monthlyLogs.forEach((log) => {
      const item = log.checklistItemId && typeof log.checklistItemId === "object" ? log.checklistItemId : items.find(i => i._id === log.checklistItemId);
      if (item && item.type === "Expense") {
        expenseByCategory[item.title] = (expenseByCategory[item.title] || 0) + log.amount;
        totalExpense += log.amount;
      }
    });

    const breakdown = Object.keys(expenseByCategory).map((title) => ({
      name: title,
      value: expenseByCategory[title],
      percentage: totalExpense > 0 ? Math.round((expenseByCategory[title] / totalExpense) * 100) : 0,
    }));

    // Sort descending
    return breakdown.sort((a, b) => b.value - a.value);
  };

  const monthlyExpenseData = getMonthlyExpenseData();

  // Process monthly income pie chart & breakdown (last 30 days)
  const getMonthlyIncomeData = () => {
    const incomeByCategory: { [key: string]: number } = {};
    let totalIncome = 0;

    monthlyLogs.forEach((log) => {
      const item = log.checklistItemId && typeof log.checklistItemId === "object" ? log.checklistItemId : items.find(i => i._id === log.checklistItemId);
      if (item && item.type === "Income") {
        incomeByCategory[item.title] = (incomeByCategory[item.title] || 0) + log.amount;
        totalIncome += log.amount;
      }
    });

    const breakdown = Object.keys(incomeByCategory).map((title) => ({
      name: title,
      value: incomeByCategory[title],
      percentage: totalIncome > 0 ? Math.round((incomeByCategory[title] / totalIncome) * 100) : 0,
    }));

    // Sort descending
    return breakdown.sort((a, b) => b.value - a.value);
  };

  const monthlyIncomeData = getMonthlyIncomeData();

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner Status */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-950/90 border border-emerald-500/40 p-4 text-emerald-400 shadow-xl backdrop-blur-md animate-bounce">
          <CheckCircle size={18} />
          <span className="font-semibold text-sm">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-rose-950/90 border border-rose-500/40 p-4 text-rose-400 shadow-xl backdrop-blur-md">
          <AlertCircle size={18} />
          <span className="font-semibold text-sm">{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="ml-2 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Date Navigation and Section Title */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Daily Checklist <span className="text-gold-gradient">Dashboard</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Choose daily titles, log amounts, and instantly review reports without complex ledgers.
          </p>
        </div>

        {/* Date Selector & Configuration Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1.5 shadow-inner">
            <button
              onClick={() => changeDateByDays(-1)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2 px-3 text-sm font-semibold text-slate-200">
              <Calendar size={14} className="text-gold-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-slate-200 text-sm font-bold focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => changeDateByDays(1)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setUpiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-950/40 text-blue-400 hover:bg-blue-900/60 hover:text-white text-sm font-bold transition shadow-lg shadow-blue-950/20"
          >
            <Smartphone size={16} />
            <span>Sync UPI Apps</span>
          </button>

          <button
            onClick={() => setConfigOpen(!configOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition ${
              configOpen
                ? "bg-gold-gradient text-slate-950 border-gold-400 font-bold"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700"
            }`}
          >
            <Settings size={16} />
            <span>Add New Checklist</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Filtered for the selected day + Past Report + Pending Payments) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {/* Today's Income */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-gold-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gold-950 border border-gold-500/20 p-3.5 text-gold-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Income Logged ({selectedDate})</p>
              <h4 className="mt-1 text-2xl font-black text-white">{formatCurrency(todayIncomesTotal)}</h4>
            </div>
          </div>
        </div>

        {/* Today's Expenses */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-red-500/10 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-red-950/30 border border-red-500/20 p-3.5 text-red-400">
              <TrendingDown className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expenses Logged ({selectedDate})</p>
              <h4 className="mt-1 text-2xl font-black text-white">{formatCurrency(todayExpensesTotal)}</h4>
            </div>
          </div>
        </div>

        {/* Today's Net profit */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
          <div className={`absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full blur-xl transition group-hover:scale-125 ${todayProfit >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}`} />
          <div className="flex items-center gap-4">
            <div className={`rounded-xl border p-3.5 ${todayProfit >= 0 ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-400" : "bg-rose-950/30 border-rose-500/20 text-rose-400"}`}>
              <CircleDollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Daily Balance Net</p>
              <h4 className={`mt-1 text-2xl font-black ${todayProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatCurrency(todayProfit)}</h4>
            </div>
          </div>
        </div>

        {/* Today Current Balance (Past Reports + Today) */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1 border-cyan-500/20">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-cyan-500/15 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-cyan-950/50 border border-cyan-500/30 p-3.5 text-cyan-400">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today Current Balance</p>
              <h4 className={`mt-1 text-2xl font-black ${todayCurrentBalance >= 0 ? "text-cyan-400" : "text-rose-400"}`}>
                {formatCurrency(todayCurrentBalance)}
              </h4>
              <p className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5 font-medium truncate">
                <span>Past: <strong className="text-slate-200">{formatCurrency(pastReportsBalance)}</strong></span>
                <span>•</span>
                <span>Today: <strong className={todayProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>{todayProfit >= 0 ? "+" : ""}{formatCurrency(todayProfit)}</strong></span>
              </p>
            </div>
          </div>
        </div>

        {/* Pending Payments Card */}
        <div className="glass-card group relative overflow-hidden rounded-2xl p-6 transition duration-300 hover:-translate-y-1 border-amber-500/30">
          <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-500/15 blur-xl transition group-hover:scale-125" />
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-amber-950/50 border border-amber-500/30 p-3.5 text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Payment</p>
              <h4 className="mt-1 text-2xl font-black text-amber-400">
                {formatCurrency(totalPendingAmount)}
              </h4>
              <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                <button
                  onClick={() => setViewPendingListOpen(true)}
                  className="text-slate-400 hover:text-white underline font-medium"
                >
                  {pendingPayments.length} pending
                </button>
                <button
                  onClick={() => setPendingModalOpen(true)}
                  className="text-amber-400 hover:text-amber-300 font-extrabold underline transition"
                >
                  + Add Pending
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Checklist UI Panel / Configuration drawer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Checklist Container */}
        <div className={`glass-card rounded-2xl p-6 transition-all duration-300 ${configOpen ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <div className="flex items-center justify-between mb-6 border-b border-slate-800/60 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle className="text-gold-400" size={18} />
              <span>Checking list for Date: {selectedDate}</span>
            </h3>
            {loading && <Loader2 className="animate-spin text-gold-400" size={18} />}
          </div>

          {items.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-4">
              <Info size={36} className="text-slate-600" />
              <div>
                <p className="font-semibold text-white">No checklist items configured yet</p>
                <p className="text-sm text-slate-500 mt-1">Click the "Configure Checklist" button in the top right to start adding titles.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-l-2 border-gold-500 pl-2">Income Checklist</h4>
                <div className="space-y-3">
                  {items.filter(i => i.type === "Income").length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No income titles added.</p>
                  ) : (
                    items
                      .filter(i => i.type === "Income")
                      .map((item) => {
                        const logged = todayLogs.find((l) => {
                          const logItemId = l.checklistItemId && typeof l.checklistItemId === "object" ? l.checklistItemId._id : l.checklistItemId;
                          return logItemId === item._id;
                        });

                        return (
                          <div
                            key={item._id}
                            onClick={() => openLogModal(item)}
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition select-none ${
                              logged
                                ? "bg-gold-950/20 border-gold-500/40 hover:border-gold-400"
                                : "bg-slate-950 border-slate-850 hover:border-slate-700 hover:bg-slate-900/40"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${
                                logged
                                  ? "bg-gold-500 border-gold-500 text-black font-black"
                                  : "border-slate-750 text-transparent"
                              }`}>
                                <Check size={14} strokeWidth={3} />
                              </div>
                              <div>
                                <span className={`text-sm font-semibold transition ${logged ? "text-white" : "text-slate-400"}`}>
                                  {item.title}
                                </span>
                                {logged?.notes && (
                                  <p className="text-[10px] text-slate-450 mt-0.5 max-w-[200px] truncate">
                                    Notes: {logged.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {logged ? (
                                <span className="text-sm font-extrabold text-gold-400">{formatCurrency(logged.amount)}</span>
                              ) : (
                                <Plus size={16} className="text-slate-600 hover:text-slate-400" />
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Expense List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-l-2 border-red-500 pl-2">Expense Checklist</h4>
                <div className="space-y-3">
                  {items.filter(i => i.type === "Expense").length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No expense titles added.</p>
                  ) : (
                    items
                      .filter(i => i.type === "Expense")
                      .map((item) => {
                        const logged = todayLogs.find((l) => {
                          const logItemId = l.checklistItemId && typeof l.checklistItemId === "object" ? l.checklistItemId._id : l.checklistItemId;
                          return logItemId === item._id;
                        });

                        return (
                          <div
                            key={item._id}
                            onClick={() => openLogModal(item)}
                            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition select-none ${
                              logged
                                ? "bg-red-950/20 border-red-500/40 hover:border-red-400"
                                : "bg-slate-950 border-slate-850 hover:border-slate-700 hover:bg-slate-900/40"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-5 w-5 rounded border flex items-center justify-center transition-all ${
                                logged
                                  ? "bg-red-500 border-red-500 text-white font-black"
                                  : "border-slate-750 text-transparent"
                              }`}>
                                <Check size={14} strokeWidth={3} />
                              </div>
                              <div>
                                <span className={`text-sm font-semibold transition ${logged ? "text-white" : "text-slate-400"}`}>
                                  {item.title}
                                </span>
                                {logged?.notes && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] truncate">
                                    Notes: {logged.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {logged ? (
                                <span className="text-sm font-extrabold text-red-400">{formatCurrency(logged.amount)}</span>
                              ) : (
                                <Plus size={16} className="text-slate-600 hover:text-slate-400" />
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Drawer */}
        {configOpen && (
          <div className="glass-card rounded-2xl p-6 flex flex-col justify-between h-full animate-in slide-in-from-right duration-250">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Settings size={18} className="text-gold-400" />
                  <span>Configure Titles</span>
                </h3>
                <button
                  onClick={() => setConfigOpen(false)}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Add New Form */}
              <form onSubmit={handleAddConfigItem} className="space-y-4 mb-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title / Ledger Name</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Electricity, Tea Expense, Office Rent, Daily Sales"
                    className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Transaction Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewType("Income")}
                      className={`py-2 px-3 rounded-lg border text-sm font-bold transition ${
                        newType === "Income"
                          ? "bg-gold-950/30 border-gold-500 text-gold-400"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      Income (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType("Expense")}
                      className={`py-2 px-3 rounded-lg border text-sm font-bold transition ${
                        newType === "Expense"
                          ? "bg-red-950/30 border-red-500/50 text-red-400"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      Expense (-)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  {savingConfig ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Add Checklist Title
                </button>
              </form>

              {/* Items List */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configured Titles</label>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No active titles.</p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-850 p-3 hover:border-slate-800 transition"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                          item.type === "Income"
                            ? "bg-gold-950/60 text-gold-400 border border-gold-500/30"
                            : "bg-red-950/40 text-red-400 border border-red-500/20"
                        }`}>
                          {item.type}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteConfigItem(item._id)}
                        className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-slate-900 rounded-lg transition"
                        title="Delete checklist title"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reports Section (Charts) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        
        {/* Weekly Expense and Profit Report */}
        <div className="glass-card lg:col-span-2 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-gold-400" />
                Weekly Expense & Profit Report
              </h3>
              <span className="text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
                Last 7 Days
              </span>
            </div>

            <div className="h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dcc522" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#dcc522" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(value) => [formatCurrency(Number(value)), ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#dcc522"
                    fillOpacity={1}
                    fill="url(#colorInc)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Expense"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorExp)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Net Profit"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorNet)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Monthly Expense breakdown */}
        <div className="glass-card lg:col-span-1 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingDown size={18} className="text-red-400" />
                Monthly Expense Report
              </h3>
              <span className="text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
                Last 30 Days
              </span>
            </div>

            {monthlyExpenseData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-16">
                <Info size={28} className="text-slate-650 mb-2" />
                <p className="text-sm font-semibold">No expenses logged in this period</p>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                <div className="h-44 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthlyExpenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {monthlyExpenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
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

                {/* Progress bars list breakdown */}
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  {monthlyExpenseData.map((item, index) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="text-slate-300">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white mr-2">{formatCurrency(item.value)}</span>
                          <span className="text-slate-500 font-medium">{item.percentage}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 border border-slate-800/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                            width: `${item.percentage}%`,
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

        {/* Monthly Income breakdown */}
        <div className="glass-card lg:col-span-1 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-gold-400" />
                Monthly Income Report
              </h3>
              <span className="text-xs text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
                Last 30 Days
              </span>
            </div>

            {monthlyIncomeData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 py-16">
                <Info size={28} className="text-slate-650 mb-2" />
                <p className="text-sm font-semibold">No income logged in this period</p>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                <div className="h-44 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={monthlyIncomeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {monthlyIncomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [formatCurrency(Number(value)), "Earned"]}
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

                {/* Progress bars list breakdown */}
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  {monthlyIncomeData.map((item, index) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="text-slate-300">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white mr-2">{formatCurrency(item.value)}</span>
                          <span className="text-slate-500 font-medium">{item.percentage}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 border border-slate-800/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                            width: `${item.percentage}%`,
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

      {/* Logging modal Overlay */}
      {logModalOpen && selectedItemForLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl relative animate-in scale-in duration-200">
            <button
              onClick={() => setLogModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <CheckCircle className={selectedItemForLog.type === "Income" ? "text-gold-400" : "text-red-400"} size={20} />
              <span>Daily checklist logging</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Storing value for <strong>{selectedItemForLog.title}</strong> ({selectedItemForLog.type}) on <strong>{selectedDate}</strong>.
            </p>

            <form onSubmit={handleSaveLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  How much daily data should be stored? (Amount in {businessCurrency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={logAmount}
                  onChange={(e) => setLogAmount(e.target.value)}
                  placeholder="e.g. 500, 12000"
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-3 text-lg font-bold"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Notes / Description (Optional)
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Specify details, payment mode or comments"
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                {/* Delete / Clear button if already checked */}
                {todayLogs.some(
                  (l) =>
                    (l.checklistItemId && typeof l.checklistItemId === "object" ? l.checklistItemId._id : l.checklistItemId) === selectedItemForLog._id
                ) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(selectedItemForLog._id)}
                    className="flex-1 rounded-xl border border-red-500/20 bg-red-950/20 py-3 text-sm font-semibold text-red-400 hover:bg-red-950/30 transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={16} />
                    Uncheck / Clear
                  </button>
                )}

                <button
                  type="submit"
                  disabled={savingLog}
                  className="flex-2 flex-grow rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black hover:brightness-110 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingLog ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={2.5} />}
                  Save Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Pending Payment Modal */}
      {pendingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl relative animate-in scale-in duration-200">
            <button
              onClick={() => setPendingModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Clock className="text-amber-400" size={20} />
              <span>Record Pending Payment</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Track outstanding dues with pending amount and description.
            </p>

            <form onSubmit={handleSavePendingPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Pending Amount ({businessCurrency})*
                </label>
                <input
                  type="number"
                  step="any"
                  value={pendingAmount}
                  onChange={(e) => setPendingAmount(e.target.value)}
                  placeholder="e.g. 4500, 12000"
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-3 text-lg font-bold text-amber-400"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Customer Name / Title*
                </label>
                <input
                  type="text"
                  value={pendingTitle}
                  onChange={(e) => setPendingTitle(e.target.value)}
                  placeholder="e.g. Rajesh Kumar - Logo Design"
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Description / Notes (Optional)
                </label>
                <textarea
                  value={pendingDescription}
                  onChange={(e) => setPendingDescription(e.target.value)}
                  placeholder="Specify payment promise date, invoice details or comments..."
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm h-20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Target Date
                </label>
                <input
                  type="date"
                  value={pendingDate}
                  onChange={(e) => setPendingDate(e.target.value)}
                  className="glass-input mt-1.5 w-full rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={savingPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-sm font-bold text-slate-950 transition disabled:opacity-50 mt-2"
              >
                {savingPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Save Pending Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Pending Payments List Modal */}
      {viewPendingListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-xl rounded-2xl p-6 border border-slate-800 shadow-2xl relative max-h-[80vh] flex flex-col">
            <button
              onClick={() => setViewPendingListOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Clock className="text-amber-400" size={20} />
                  <span>Pending Payments List</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total Outstanding: <strong className="text-amber-400">{formatCurrency(totalPendingAmount)}</strong> ({pendingPayments.length} items)
                </p>
              </div>

              <button
                onClick={() => {
                  setViewPendingListOpen(false);
                  setPendingModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition"
              >
                <Plus size={14} />
                <span>Add New</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {pendingPayments.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Info size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No pending payments found.</p>
                  <p className="text-xs text-slate-600 mt-1">All dues cleared!</p>
                </div>
              ) : (
                pendingPayments.map((p) => (
                  <div
                    key={p._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-850 gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{p.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-500/30 font-bold">
                          Pending
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-slate-400 italic">Notes: {p.description}</p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        Date: {new Date(p.date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-base font-black text-amber-400">
                        {formatCurrency(p.amount)}
                      </span>
                      <button
                        onClick={() => handleMarkCollected(p._id, p.title)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/60 text-xs font-bold transition flex items-center gap-1"
                        title="Mark as Collected"
                      >
                        <Check size={12} strokeWidth={3} />
                        Collected
                      </button>
                      <button
                        onClick={() => handleDeletePendingPayment(p._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition"
                        title="Delete pending payment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* UPI Apps Integration Modal */}
      <UpiSyncModal
        isOpen={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        onSuccess={fetchAllData}
        checklistItems={items.map((i) => ({ _id: i._id, title: i.title, type: i.type }))}
      />
    </div>
  );
}

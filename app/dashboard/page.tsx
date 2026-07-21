import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/jwt";
import { connectToDatabase } from "@/lib/db";
import { Business, ChecklistItem, ChecklistLog, PendingPayment, Credit } from "@/models";
import ChecklistDashboard from "@/app/dashboard/ChecklistDashboard";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.businessId) {
    cookieStore.delete("token");
    redirect("/login");
  }

  const { businessId } = decoded;

  let currency = "INR";
  let initialItems: any[] = [];
  let initialTodayLogs: any[] = [];
  let initialAllLogs: any[] = [];
  let initialPendingPayments: any[] = [];
  let initialCredits: any[] = [];

  try {
    await connectToDatabase();

    // Get business info for currency setting
    const business = await Business.findById(businessId);
    if (business?.currency) {
      currency = business.currency;
    }

    // Fetch checklist items configured for this business
    const checklistItems = await ChecklistItem.find({
      businessId,
      active: true,
    }).sort({ createdAt: 1 });

    // Get current date normalized to midnight
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

    // Fetch today's checklist logs
    const todayLogs = await ChecklistLog.find({
      businessId,
      date: startOfToday,
    }).populate("checklistItemId");

    // Fetch all historical logs for cumulative balance calculation
    const allLogs = await ChecklistLog.find({
      businessId,
    }).populate("checklistItemId").sort({ date: 1 });

    // Fetch pending payments
    const pendingPayments = await PendingPayment.find({
      businessId,
      status: "Pending",
    }).sort({ date: -1 });

    // Fetch credits (money borrowed that needs to be returned)
    const credits = await Credit.find({
      businessId,
      status: "Pending",
    }).sort({ dateTaken: -1 });

    const safeDateISO = (d: any) => {
      if (!d) return new Date().toISOString();
      try {
        const dateObj = d instanceof Date ? d : new Date(d);
        return isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    // Normalize documents to plain objects for safe client-side serialization
    initialItems = checklistItems.map((item) => ({
      _id: item._id.toString(),
      title: item.title || "",
      type: item.type || "Expense",
      active: Boolean(item.active),
    }));

    initialTodayLogs = todayLogs.map((log) => ({
      _id: log._id.toString(),
      checklistItemId:
        log.checklistItemId && typeof log.checklistItemId === "object"
          ? {
              _id: log.checklistItemId._id ? log.checklistItemId._id.toString() : "",
              title: log.checklistItemId.title || "",
              type: log.checklistItemId.type || "Expense",
              active: Boolean(log.checklistItemId.active),
            }
          : log.checklistItemId
          ? log.checklistItemId.toString()
          : "",
      amount: Number(log.amount) || 0,
      date: safeDateISO(log.date),
      notes: log.notes || "",
    }));

    initialAllLogs = allLogs.map((log) => ({
      _id: log._id.toString(),
      checklistItemId:
        log.checklistItemId && typeof log.checklistItemId === "object"
          ? {
              _id: log.checklistItemId._id ? log.checklistItemId._id.toString() : "",
              title: log.checklistItemId.title || "",
              type: log.checklistItemId.type || "Expense",
              active: Boolean(log.checklistItemId.active),
            }
          : log.checklistItemId
          ? log.checklistItemId.toString()
          : "",
      amount: Number(log.amount) || 0,
      date: safeDateISO(log.date),
      notes: log.notes || "",
    }));

    initialPendingPayments = pendingPayments.map((p) => ({
      _id: p._id.toString(),
      title: p.title || "",
      amount: Number(p.amount) || 0,
      description: p.description || "",
      customerName: p.customerName || "",
      status: p.status || "Pending",
      date: safeDateISO(p.date),
    }));

    initialCredits = credits.map((c) => ({
      _id: c._id.toString(),
      lenderName: c.lenderName || "Lender",
      amount: Number(c.amount) || 0,
      description: c.description || "",
      dateTaken: safeDateISO(c.dateTaken),
      dueDate: c.dueDate ? safeDateISO(c.dueDate) : null,
      status: c.status || "Pending",
    }));
  } catch (err) {
    console.error("Dashboard Page Server Component render error:", err);
  }

  return (
    <ChecklistDashboard
      initialItems={initialItems}
      initialTodayLogs={initialTodayLogs}
      initialAllLogs={initialAllLogs}
      initialPendingPayments={initialPendingPayments}
      initialCredits={initialCredits}
      businessCurrency={currency}
    />
  );
}

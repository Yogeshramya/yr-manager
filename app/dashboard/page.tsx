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
    redirect("/login");
  }

  const { businessId } = decoded;

  await connectToDatabase();

  // Get business info for currency setting
  const business = await Business.findById(businessId);
  const currency = business?.currency || "INR";

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

  // Normalize documents to plain objects for safe client-side serialization
  const initialItems = checklistItems.map((item) => ({
    _id: item._id.toString(),
    title: item.title,
    type: item.type,
    active: item.active,
  }));

  const initialTodayLogs = todayLogs.map((log) => ({
    _id: log._id.toString(),
    checklistItemId:
      log.checklistItemId && typeof log.checklistItemId === "object"
        ? {
            _id: log.checklistItemId._id.toString(),
            title: log.checklistItemId.title,
            type: log.checklistItemId.type,
            active: log.checklistItemId.active,
          }
        : log.checklistItemId
        ? log.checklistItemId.toString()
        : "",
    amount: log.amount,
    date: log.date.toISOString(),
    notes: log.notes || "",
  }));

  const initialAllLogs = allLogs.map((log) => ({
    _id: log._id.toString(),
    checklistItemId:
      log.checklistItemId && typeof log.checklistItemId === "object"
        ? {
            _id: log.checklistItemId._id.toString(),
            title: log.checklistItemId.title,
            type: log.checklistItemId.type,
            active: log.checklistItemId.active,
          }
        : log.checklistItemId
        ? log.checklistItemId.toString()
        : "",
    amount: log.amount,
    date: log.date.toISOString(),
    notes: log.notes || "",
  }));

  const initialPendingPayments = pendingPayments.map((p) => ({
    _id: p._id.toString(),
    title: p.title,
    amount: p.amount,
    description: p.description || "",
    customerName: p.customerName || "",
    status: p.status,
    date: p.date.toISOString(),
  }));

  const initialCredits = credits.map((c) => ({
    _id: c._id.toString(),
    lenderName: c.lenderName,
    amount: c.amount,
    description: c.description || "",
    dateTaken: c.dateTaken instanceof Date ? c.dateTaken.toISOString() : String(c.dateTaken),
    dueDate: c.dueDate ? (c.dueDate instanceof Date ? c.dueDate.toISOString() : String(c.dueDate)) : null,
    status: c.status,
  }));

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

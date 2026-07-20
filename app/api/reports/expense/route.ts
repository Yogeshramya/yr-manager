import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { Expense, ChecklistLog, ChecklistItem, Supplier } from "@/models";
import { verifyToken } from "@/lib/jwt";

function getRangeDates(range?: string, startInput?: string, endInput?: string) {
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (range === "today") {
    // defaults to today
  } else if (range === "week") {
    startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (range === "all") {
    startDate = new Date(2000, 0, 1);
  } else if (range === "custom" && startInput) {
    startDate = new Date(startInput);
    if (endInput) {
      endDate = new Date(endInput);
      endDate.setHours(23, 59, 59, 999);
    }
  }

  return { startDate, endDate };
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "month";
    const startInput = searchParams.get("startDate") || undefined;
    const endInput = searchParams.get("endDate") || undefined;

    const { startDate, endDate } = getRangeDates(range, startInput, endInput);

    await connectToDatabase();

    // 1. Fetch configured real Expense Checklist Items
    const expenseChecklistItems = await ChecklistItem.find({
      businessId: decoded.businessId,
      type: "Expense",
      active: true,
    }).sort({ title: 1 });

    // 2. Fetch formal Expenses
    const expenses = await Expense.find({
      businessId: decoded.businessId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("supplierId")
      .sort({ date: -1 });

    // 3. Fetch Checklist Logs
    const checklistLogs = await ChecklistLog.find({
      businessId: decoded.businessId,
      date: { $gte: startDate, $lte: endDate },
    }).populate("checklistItemId");

    const validChecklistExpenses = checklistLogs.filter((log) => {
      if (!log.checklistItemId) return false;
      if (typeof log.checklistItemId === "object") {
        return log.checklistItemId.type === "Expense";
      }
      return false;
    });

    // Format all expense transactions into a unified list
    const formalRecords = expenses.map((exp) => ({
      _id: exp._id.toString(),
      source: "Formal Expense",
      category: exp.category || "Other",
      supplierName: exp.supplierId ? exp.supplierId.name : "N/A",
      amount: exp.amount,
      date: exp.date.toISOString(),
      notes: exp.notes || "",
    }));

    const checklistRecords = validChecklistExpenses.map((log) => {
      const itemObj = typeof log.checklistItemId === "object" ? log.checklistItemId : null;
      return {
        _id: log._id.toString(),
        source: "Daily Checklist",
        category: itemObj ? itemObj.title : "Checklist Expense",
        supplierName: "Daily Operations",
        amount: log.amount,
        date: log.date.toISOString(),
        notes: log.notes || "",
      };
    });

    const allRecords = [...formalRecords, ...checklistRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Summary calculation
    const totalExpense = allRecords.reduce((acc, r) => acc + r.amount, 0);
    const averageExpense = allRecords.length > 0 ? Math.round(totalExpense / allRecords.length) : 0;

    // Category Breakdown
    const catMap: { [key: string]: number } = {};
    allRecords.forEach((r) => {
      const cat = r.category || "Other";
      catMap[cat] = (catMap[cat] || 0) + r.amount;
    });

    const categoryBreakdown = Object.keys(catMap)
      .map((c) => ({
        name: c,
        amount: catMap[c],
        percentage: totalExpense > 0 ? Math.round((catMap[c] / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].name : "N/A";

    // Fetch suppliers list for modal dropdown
    const suppliers = await Supplier.find({ businessId: decoded.businessId }).select("name contactName phone");

    return NextResponse.json({
      success: true,
      records: allRecords,
      summary: {
        totalExpense,
        topCategory,
        totalCount: allRecords.length,
        averageExpense,
      },
      categoryBreakdown,
      checklistItems: expenseChecklistItems.map((item) => ({
        _id: item._id.toString(),
        title: item.title,
      })),
      suppliers: suppliers.map((s) => ({ _id: s._id.toString(), name: s.name })),
    });
  } catch (error: any) {
    console.error("Expense Report API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch expense report" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { checklistItemId, category, amount, supplierId, date, notes } = await request.json();

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: "Valid expense amount is required" }, { status: 400 });
    }

    await connectToDatabase();

    const targetDate = date ? new Date(date) : new Date();

    if (checklistItemId) {
      // Normalize target date to midnight
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

      const query = {
        businessId: decoded.businessId,
        checklistItemId,
        date: startOfDay,
      };

      const update = {
        amount: Number(amount),
        notes: notes || "",
      };

      const updatedLog = await ChecklistLog.findOneAndUpdate(
        query,
        { $set: update },
        { upsert: true, returnDocument: "after" }
      );

      return NextResponse.json({ success: true, record: updatedLog });
    } else {
      const newExpense = new Expense({
        category: category || "Other",
        amount: Number(amount),
        supplierId: supplierId || undefined,
        date: targetDate,
        notes: notes || "",
        businessId: decoded.businessId,
      });

      await newExpense.save();
      return NextResponse.json({ success: true, record: newExpense });
    }
  } catch (error: any) {
    console.error("Create Expense error:", error);
    return NextResponse.json({ error: error.message || "Failed to create expense record" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const source = searchParams.get("source");
    const clearMock = searchParams.get("clearMock");

    await connectToDatabase();

    if (clearMock === "true") {
      // Clear sample seed Expense records
      await Expense.deleteMany({ businessId: decoded.businessId });
      return NextResponse.json({ success: true, message: "Cleared sample expense records" });
    }

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    if (source === "Daily Checklist") {
      await ChecklistLog.findOneAndDelete({ _id: id, businessId: decoded.businessId });
    } else {
      await Expense.findOneAndDelete({ _id: id, businessId: decoded.businessId });
    }

    return NextResponse.json({ success: true, message: "Expense record deleted successfully" });
  } catch (error: any) {
    console.error("Delete Expense error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete expense record" }, { status: 500 });
  }
}

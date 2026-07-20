import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { Income, ChecklistLog, ChecklistItem, Customer } from "@/models";
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

    // 1. Fetch configured real Income Checklist Items
    const incomeChecklistItems = await ChecklistItem.find({
      businessId: decoded.businessId,
      type: "Income",
      active: true,
    }).sort({ title: 1 });

    // 2. Fetch formal Incomes
    const incomes = await Income.find({
      businessId: decoded.businessId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("customerId")
      .sort({ date: -1 });

    // 3. Fetch Checklist Logs
    const checklistLogs = await ChecklistLog.find({
      businessId: decoded.businessId,
      date: { $gte: startDate, $lte: endDate },
    }).populate("checklistItemId");

    const validChecklistIncomes = checklistLogs.filter((log) => {
      if (!log.checklistItemId) return false;
      if (typeof log.checklistItemId === "object") {
        return log.checklistItemId.type === "Income";
      }
      return false;
    });

    // Format all income transactions into a unified list
    const formalRecords = incomes.map((inc) => ({
      _id: inc._id.toString(),
      source: "Invoice/Order",
      title: inc.notes || (inc.customerId ? inc.customerId.name : "Income Payment"),
      invoiceNumber: inc.invoiceNumber || "N/A",
      customerName: inc.customerId ? inc.customerId.name : "Direct Customer",
      amount: inc.amount,
      paymentStatus: inc.paymentStatus || "Paid",
      paymentMethod: inc.paymentMethod || "UPI",
      date: inc.date.toISOString(),
      notes: inc.notes || "",
    }));

    const checklistRecords = validChecklistIncomes.map((log) => {
      const itemObj = typeof log.checklistItemId === "object" ? log.checklistItemId : null;
      return {
        _id: log._id.toString(),
        source: "Daily Checklist",
        title: itemObj ? itemObj.title : "Checklist Income",
        invoiceNumber: "CHK-LOG",
        customerName: "Daily Operations",
        amount: log.amount,
        paymentStatus: "Paid",
        paymentMethod: "Cash/UPI",
        date: log.date.toISOString(),
        notes: log.notes || "",
      };
    });

    const allRecords = [...formalRecords, ...checklistRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Summary calculation
    const totalIncome = allRecords.reduce((acc, r) => acc + r.amount, 0);
    const paidIncome = allRecords
      .filter((r) => r.paymentStatus === "Paid")
      .reduce((acc, r) => acc + r.amount, 0);
    const pendingIncome = allRecords
      .filter((r) => r.paymentStatus === "Pending")
      .reduce((acc, r) => acc + r.amount, 0);
    const averageIncome = allRecords.length > 0 ? Math.round(totalIncome / allRecords.length) : 0;

    // Payment Method Breakdown
    const methodMap: { [key: string]: number } = {};
    allRecords.forEach((r) => {
      const method = r.paymentMethod || "Other";
      methodMap[method] = (methodMap[method] || 0) + r.amount;
    });

    const methodBreakdown = Object.keys(methodMap).map((m) => ({
      name: m,
      amount: methodMap[m],
      percentage: totalIncome > 0 ? Math.round((methodMap[m] / totalIncome) * 100) : 0,
    }));

    // Fetch customers list for modal dropdown
    const customers = await Customer.find({ businessId: decoded.businessId }).select("name email phone");

    return NextResponse.json({
      success: true,
      records: allRecords,
      summary: {
        totalIncome,
        paidIncome,
        pendingIncome,
        totalCount: allRecords.length,
        averageIncome,
      },
      methodBreakdown,
      checklistItems: incomeChecklistItems.map((item) => ({
        _id: item._id.toString(),
        title: item.title,
      })),
      customers: customers.map((c) => ({ _id: c._id.toString(), name: c.name })),
    });
  } catch (error: any) {
    console.error("Income Report API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch income report" }, { status: 500 });
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

    const { checklistItemId, invoiceNumber, customerId, amount, paymentStatus, paymentMethod, date, notes } = await request.json();

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: "Valid income amount is required" }, { status: 400 });
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
      const generatedInv = invoiceNumber || `INC-${Date.now().toString().slice(-6)}`;

      const newIncome = new Income({
        invoiceNumber: generatedInv,
        customerId: customerId || undefined,
        amount: Number(amount),
        paymentStatus: paymentStatus || "Paid",
        paymentMethod: paymentMethod || "UPI",
        date: targetDate,
        notes: notes || "",
        businessId: decoded.businessId,
      });

      await newIncome.save();
      return NextResponse.json({ success: true, record: newIncome });
    }
  } catch (error: any) {
    console.error("Create Income error:", error);
    return NextResponse.json({ error: error.message || "Failed to create income record" }, { status: 500 });
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
      // Clear sample seed Income records
      await Income.deleteMany({ businessId: decoded.businessId });
      return NextResponse.json({ success: true, message: "Cleared sample income records" });
    }

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    if (source === "Daily Checklist") {
      await ChecklistLog.findOneAndDelete({ _id: id, businessId: decoded.businessId });
    } else {
      await Income.findOneAndDelete({ _id: id, businessId: decoded.businessId });
    }

    return NextResponse.json({ success: true, message: "Income record deleted successfully" });
  } catch (error: any) {
    console.error("Delete Income error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete income record" }, { status: 500 });
  }
}

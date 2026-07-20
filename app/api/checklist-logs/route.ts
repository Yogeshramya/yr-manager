import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { ChecklistLog } from "@/models/ChecklistLog";
import { verifyToken } from "@/lib/jwt";

function getStartOfDay(dateInput?: string) {
  let date = new Date();
  if (dateInput) {
    // Expected format: YYYY-MM-DD
    const parts = dateInput.split("-");
    if (parts.length === 3) {
      date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      date = new Date(dateInput);
    }
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
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
    const dateInput = searchParams.get("date");
    const range = searchParams.get("range"); // "today", "week", "month"

    await connectToDatabase();

    let query: any = { businessId: decoded.businessId };

    if (range === "week") {
      const todayStart = getStartOfDay();
      const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
      query.date = { $gte: sevenDaysAgo, $lte: todayStart };
    } else if (range === "month") {
      const todayStart = getStartOfDay();
      const thirtyDaysAgo = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
      query.date = { $gte: thirtyDaysAgo, $lte: todayStart };
    } else if (range === "all") {
      // Return all logs for business without date filter
    } else {
      // Default: fetch for a specific date (today if not provided)
      const targetDate = getStartOfDay(dateInput || undefined);
      query.date = targetDate;
    }

    const logs = await ChecklistLog.find(query).populate("checklistItemId").sort({ date: 1 });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error("Fetch checklist logs error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch logs" }, { status: 500 });
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

    const { checklistItemId, amount, dateInput, notes } = await request.json();

    if (!checklistItemId) {
      return NextResponse.json({ error: "Checklist item ID is required" }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    const startOfDay = getStartOfDay(dateInput);

    await connectToDatabase();

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

    return NextResponse.json({ success: true, log: updatedLog });
  } catch (error: any) {
    console.error("Save checklist log error:", error);
    return NextResponse.json({ error: error.message || "Failed to save log" }, { status: 500 });
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
    const checklistItemId = searchParams.get("checklistItemId");
    const dateInput = searchParams.get("date");

    if (!checklistItemId) {
      return NextResponse.json({ error: "Checklist item ID is required" }, { status: 400 });
    }

    const startOfDay = getStartOfDay(dateInput || undefined);

    await connectToDatabase();

    const deleted = await ChecklistLog.findOneAndDelete({
      businessId: decoded.businessId,
      checklistItemId,
      date: startOfDay,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Log entry deleted successfully" });
  } catch (error: any) {
    console.error("Delete checklist log error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete log" }, { status: 500 });
  }
}

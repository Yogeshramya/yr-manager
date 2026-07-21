import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { ChecklistLog, ChecklistItem, Credit, PendingPayment } from "@/models";
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

    const logs = await ChecklistLog.find(query).populate("checklistItemId").sort({ date: 1 }).lean();

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

    const { checklistItemId, amount, dateInput, notes, logId } = await request.json();

    if (!checklistItemId) {
      return NextResponse.json({ error: "Checklist item ID is required" }, { status: 400 });
    }
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    const startOfDay = getStartOfDay(dateInput);

    await connectToDatabase();

    // Drop legacy unique index if it exists in MongoDB
    try {
      await ChecklistLog.collection.dropIndex("businessId_1_checklistItemId_1_date_1");
    } catch (e) {
      // Ignore if index doesn't exist
    }

    let updatedLog;
    if (logId) {
      // Update existing specific log entry
      updatedLog = await ChecklistLog.findOneAndUpdate(
        { _id: logId, businessId: decoded.businessId },
        { $set: { amount: Number(amount), notes: notes || "" } },
        { returnDocument: "after" }
      );
    } else {
      // Create a NEW log entry (allows multiple entries for the same title on the same day)
      updatedLog = new ChecklistLog({
        businessId: decoded.businessId,
        checklistItemId,
        amount: Number(amount),
        date: startOfDay,
        notes: notes || "",
      });
      await updatedLog.save();
    }

    if (!updatedLog) {
      return NextResponse.json({ error: "Failed to save log entry" }, { status: 404 });
    }

    const itemObj = await ChecklistItem.findById(checklistItemId);
    if (itemObj) {
      const lowerTitle = itemObj.title.toLowerCase();

      // Auto-sync with Credit collection if title contains "credit"
      if (lowerTitle.includes("credit")) {
        const lenderName = notes && notes.trim() ? notes.trim() : itemObj.title;
        await Credit.findOneAndUpdate(
          { businessId: decoded.businessId, logId: updatedLog._id },
          {
            $set: {
              lenderName,
              amount: Number(amount),
              description: notes ? notes.trim() : `Auto-logged under ${itemObj.title}`,
              dateTaken: startOfDay,
              checklistItemId,
              status: "Pending",
            },
          },
          { upsert: true, returnDocument: "after" }
        );
      }

      // Auto-sync with PendingPayment collection if title contains "pending"
      if (lowerTitle.includes("pending")) {
        const pTitle = notes && notes.trim() ? notes.trim() : itemObj.title;
        await PendingPayment.findOneAndUpdate(
          { businessId: decoded.businessId, logId: updatedLog._id },
          {
            $set: {
              title: pTitle,
              customerName: pTitle,
              amount: Number(amount),
              description: notes ? notes.trim() : `Auto-logged under ${itemObj.title}`,
              date: startOfDay,
              checklistItemId,
              status: "Pending",
            },
          },
          { upsert: true, returnDocument: "after" }
        );
      }
    }

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
    const logId = searchParams.get("logId") || searchParams.get("id");
    const checklistItemId = searchParams.get("checklistItemId");
    const dateInput = searchParams.get("date");

    await connectToDatabase();

    let deleted;
    if (logId) {
      // Delete specific log entry by ID
      deleted = await ChecklistLog.findOneAndDelete({
        _id: logId,
        businessId: decoded.businessId,
      });
    } else if (checklistItemId) {
      // Delete all logs for this checklist item on the specified date
      const startOfDay = getStartOfDay(dateInput || undefined);
      deleted = await ChecklistLog.findOneAndDelete({
        businessId: decoded.businessId,
        checklistItemId,
        date: startOfDay,
      });
    } else {
      return NextResponse.json({ error: "logId or checklistItemId is required" }, { status: 400 });
    }

    if (deleted) {
      // Delete any auto-created Credit or PendingPayment entries linked to this log
      await Promise.all([
        Credit.deleteMany({
          businessId: decoded.businessId,
          $or: [{ logId: deleted._id }],
        }),
        PendingPayment.deleteMany({
          businessId: decoded.businessId,
          $or: [{ logId: deleted._id }],
        }),
      ]);
    }

    if (!deleted) {
      return NextResponse.json({ error: "Log entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Log entry deleted successfully" });
  } catch (error: any) {
    console.error("Delete checklist log error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete log" }, { status: 500 });
  }
}




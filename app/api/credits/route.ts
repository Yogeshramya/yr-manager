import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { Credit, ChecklistItem, ChecklistLog } from "@/models";
import { verifyToken } from "@/lib/jwt";

// GET — fetch all pending credits for the business
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    const credits = await Credit.find({
      businessId: decoded.businessId,
      status: "Pending",
    })
      .sort({ dateTaken: -1 })
      .lean();

    const totalCreditAmount = credits.reduce((sum, c) => sum + c.amount, 0);

    return NextResponse.json({
      success: true,
      credits: credits.map((c) => ({
        _id: c._id.toString(),
        lenderName: c.lenderName,
        amount: c.amount,
        description: c.description || "",
        dateTaken: c.dateTaken instanceof Date ? c.dateTaken.toISOString() : String(c.dateTaken),
        dueDate: c.dueDate ? (c.dueDate instanceof Date ? c.dueDate.toISOString() : String(c.dueDate)) : null,
        status: c.status,
      })),
      totalCreditAmount,
      creditCount: credits.length,
    });
  } catch (error: any) {
    console.error("Fetch Credits error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch credits" }, { status: 500 });
  }
}

// POST — create a new credit entry
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { lenderName, amount, description, dateTaken, dueDate } = await request.json();

    if (!lenderName || !lenderName.trim()) {
      return NextResponse.json({ error: "Lender name is required" }, { status: 400 });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid credit amount is required" }, { status: 400 });
    }

    await connectToDatabase();

    const newCredit = new Credit({
      businessId: decoded.businessId,
      lenderName: lenderName.trim(),
      amount: Number(amount),
      description: description ? description.trim() : "",
      dateTaken: dateTaken ? new Date(dateTaken) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      status: "Pending",
    });

    await newCredit.save();

    return NextResponse.json({ success: true, credit: newCredit });
  } catch (error: any) {
    console.error("Create Credit error:", error);
    return NextResponse.json({ error: error.message || "Failed to create credit" }, { status: 500 });
  }
}

// PUT — update credit status (mark as Returned or Cancelled)
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    await connectToDatabase();

    const credit = await Credit.findOne({
      _id: id,
      businessId: decoded.businessId,
    });

    if (!credit) {
      return NextResponse.json({ error: "Credit entry not found" }, { status: 404 });
    }

    credit.status = status;
    await credit.save();

    // When status is marked as Returned, automatically log an Expense entry for today
    // so it deducts from the Current Balance!
    if (status === "Returned") {
      let creditReturnedItem = await ChecklistItem.findOne({
        businessId: decoded.businessId,
        title: "Credit Returned",
        type: "Expense",
      });

      if (!creditReturnedItem) {
        creditReturnedItem = new ChecklistItem({
          businessId: decoded.businessId,
          title: "Credit Returned",
          type: "Expense",
          active: true,
        });
        await creditReturnedItem.save();
      }

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

      // Create a ChecklistLog so returning credit deducts from Current Balance
      const returnedLog = new ChecklistLog({
        businessId: decoded.businessId,
        checklistItemId: creditReturnedItem._id,
        amount: credit.amount,
        date: startOfToday,
        notes: `Returned Credit to ${credit.lenderName}${credit.description ? ` (${credit.description})` : ""}`,
      });
      await returnedLog.save();
    }

    return NextResponse.json({ success: true, credit });
  } catch (error: any) {
    console.error("Update Credit error:", error);
    return NextResponse.json({ error: error.message || "Failed to update credit" }, { status: 500 });
  }
}


// DELETE — remove a credit entry
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

    if (!id) {
      return NextResponse.json({ error: "Credit ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const deleted = await Credit.findOneAndDelete({
      _id: id,
      businessId: decoded.businessId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Credit entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Credit entry deleted successfully" });
  } catch (error: any) {
    console.error("Delete Credit error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete credit" }, { status: 500 });
  }
}

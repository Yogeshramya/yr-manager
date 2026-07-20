import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { Income, Expense, ChecklistLog } from "@/models";
import { verifyToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.businessId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    const businessId = decoded.businessId;

    // Delete all old income, expense, and checklist log records for this business
    const [incomeResult, expenseResult, checklistLogResult] = await Promise.all([
      Income.deleteMany({ businessId }),
      Expense.deleteMany({ businessId }),
      ChecklistLog.deleteMany({ businessId }),
    ]);

    return NextResponse.json({
      success: true,
      message: "All old records deleted successfully. Data reset to ZERO!",
      deleted: {
        incomes: incomeResult.deletedCount,
        expenses: expenseResult.deletedCount,
        checklistLogs: checklistLogResult.deletedCount,
      },
    });
  } catch (error: any) {
    console.error("Reset data error:", error);
    return NextResponse.json({ error: error.message || "Failed to reset data" }, { status: 500 });
  }
}

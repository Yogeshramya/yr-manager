import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { PendingPayment, Income } from "@/models";
import { verifyToken } from "@/lib/jwt";

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

    const pendingPayments = await PendingPayment.find({
      businessId: decoded.businessId,
      status: "Pending",
    }).sort({ date: -1 });

    const totalPendingAmount = pendingPayments.reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      success: true,
      pendingPayments: pendingPayments.map((item) => ({
        _id: item._id.toString(),
        title: item.title,
        amount: item.amount,
        description: item.description || "",
        customerName: item.customerName || "",
        status: item.status,
        date: item.date.toISOString(),
      })),
      totalPendingAmount,
      pendingCount: pendingPayments.length,
    });
  } catch (error: any) {
    console.error("Fetch Pending Payments error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch pending payments" }, { status: 500 });
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

    const { title, amount, description, customerName, date } = await request.json();

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Title or Customer name is required" }, { status: 400 });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid pending payment amount is required" }, { status: 400 });
    }

    await connectToDatabase();

    const newPendingPayment = new PendingPayment({
      businessId: decoded.businessId,
      title: title.trim(),
      amount: Number(amount),
      description: description ? description.trim() : "",
      customerName: customerName ? customerName.trim() : title.trim(),
      status: "Pending",
      date: date ? new Date(date) : new Date(),
    });

    await newPendingPayment.save();

    return NextResponse.json({ success: true, pendingPayment: newPendingPayment });
  } catch (error: any) {
    console.error("Create Pending Payment error:", error);
    return NextResponse.json({ error: error.message || "Failed to create pending payment" }, { status: 500 });
  }
}

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

    const item = await PendingPayment.findOne({
      _id: id,
      businessId: decoded.businessId,
    });

    if (!item) {
      return NextResponse.json({ error: "Pending payment not found" }, { status: 404 });
    }

    item.status = status;
    await item.save();

    // If marked as Collected, automatically create a cleared Income record!
    if (status === "Collected") {
      const newIncome = new Income({
        invoiceNumber: `CLR-${Date.now().toString().slice(-6)}`,
        amount: item.amount,
        paymentStatus: "Paid",
        paymentMethod: "UPI",
        date: new Date(),
        notes: `Collected Pending: ${item.title}${item.description ? ` (${item.description})` : ""}`,
        businessId: decoded.businessId,
      });
      await newIncome.save();
    }

    return NextResponse.json({ success: true, pendingPayment: item });
  } catch (error: any) {
    console.error("Update Pending Payment error:", error);
    return NextResponse.json({ error: error.message || "Failed to update pending payment" }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: "Pending payment ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const deleted = await PendingPayment.findOneAndDelete({
      _id: id,
      businessId: decoded.businessId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Pending payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Pending payment deleted successfully" });
  } catch (error: any) {
    console.error("Delete Pending Payment error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete pending payment" }, { status: 500 });
  }
}

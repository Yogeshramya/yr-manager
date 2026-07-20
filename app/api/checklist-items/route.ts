import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { ChecklistItem } from "@/models/ChecklistItem";
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
    const items = await ChecklistItem.find({
      businessId: decoded.businessId,
      active: true,
    }).sort({ createdAt: 1 });

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    console.error("Fetch checklist items error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch items" }, { status: 500 });
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

    const { title, type } = await request.json();
    if (!title || !type) {
      return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
    }

    if (!["Income", "Expense"].includes(type)) {
      return NextResponse.json({ error: "Type must be Income or Expense" }, { status: 400 });
    }

    await connectToDatabase();

    // Check for duplicate title (case insensitive)
    const normalizedTitle = title.trim();
    const existing = await ChecklistItem.findOne({
      businessId: decoded.businessId,
      title: { $regex: new RegExp(`^${normalizedTitle}$`, "i") },
    });

    if (existing) {
      if (existing.active) {
        return NextResponse.json({ error: "A checklist item with this title already exists" }, { status: 400 });
      } else {
        // Reactivate item
        existing.active = true;
        existing.type = type;
        await existing.save();
        return NextResponse.json({ success: true, item: existing });
      }
    }

    const newItem = new ChecklistItem({
      businessId: decoded.businessId,
      title: normalizedTitle,
      type,
    });

    await newItem.save();
    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error("Create checklist item error:", error);
    return NextResponse.json({ error: error.message || "Failed to create item" }, { status: 500 });
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
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Soft delete / deactivate so historical logs are not broken
    const item = await ChecklistItem.findOneAndUpdate(
      { _id: id, businessId: decoded.businessId },
      { active: false },
      { returnDocument: "after" }
    );

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Item deleted successfully" });
  } catch (error: any) {
    console.error("Delete checklist item error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete item" }, { status: 500 });
  }
}

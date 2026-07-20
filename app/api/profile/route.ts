import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { verifyToken } from "@/lib/jwt";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { name, username, email, businessName, address, gstin } = await request.json();

    await connectToDatabase();

    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (name) user.name = name.trim();
    if (username) user.username = username.trim().toLowerCase();
    if (email !== undefined) user.email = email.trim();
    await user.save();

    if (user.businessId) {
      const business = await Business.findById(user.businessId);
      if (business) {
        if (businessName) business.name = businessName.trim();
        if (address !== undefined) business.address = address.trim();
        if (gstin !== undefined) business.gstin = gstin.trim();
        await business.save();
      }
    }

    const updatedUser = await User.findById(user._id).populate("businessId").select("-password").lean();

    return NextResponse.json({
      success: true,
      message: "Profile details updated successfully!",
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "value";
      return NextResponse.json(
        { error: `That ${field} is already associated with another workspace account.` },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}

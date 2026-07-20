import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { username, name, email, password, businessName } = await request.json();

    const cleanUsername = username ? username.trim().toLowerCase() : "";
    const cleanEmail = email ? email.trim().toLowerCase() : "";

    if (!cleanUsername) {
      return NextResponse.json({ error: "Username is required for registration" }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    if (!businessName || !businessName.trim()) {
      return NextResponse.json({ error: "Business / Store Name is required" }, { status: 400 });
    }

    // Check existing username or email
    const queryConditions: any[] = [{ username: cleanUsername }];
    if (cleanEmail) {
      queryConditions.push({ email: cleanEmail });
    }

    const existingUser = await User.findOne({ $or: queryConditions });
    if (existingUser) {
      return NextResponse.json({ error: "Username or Email is already registered" }, { status: 400 });
    }

    // 1. Create Business Workspace
    const newBusiness = new Business({
      name: businessName.trim(),
      address: "",
      gstin: "",
      currency: "INR",
    });
    await newBusiness.save();

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create User Account
    const newUser = new User({
      name: name && name.trim() ? name.trim() : cleanUsername,
      username: cleanUsername,
      email: cleanEmail || `${cleanUsername}@workspace.local`,
      password: hashedPassword,
      role: "Business Owner",
      businessId: newBusiness._id,
    });
    await newUser.save();

    // 4. Generate Auth Token Cookie
    const token = signToken({
      userId: newUser._id.toString(),
      role: newUser.role,
      businessId: newBusiness._id.toString(),
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Business workspace registered successfully!",
        user: {
          id: newUser._id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          businessId: newBusiness._id,
        },
      },
      { status: 201 }
    );

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Registration API error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "value";
      return NextResponse.json(
        { error: `That ${field} is already taken. Please choose another ${field}.` },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

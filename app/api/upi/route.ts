import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { Income, Business, ChecklistLog } from "@/models";
import { verifyToken } from "@/lib/jwt";

// Helper to parse UPI SMS / notification text
function parseUpiText(text: string) {
  let amount = 0;
  let utr = "";
  let payerName = "";
  let appName = "UPI";

  // Match amount (e.g., Rs 550, Rs. 1,200.00, INR 500, Received ₹450)
  const amountMatch = text.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) || text.match(/credited (?:by|with)\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ""));
  }

  // Match UTR / Ref No (12 digit number or Ref: 123456789012)
  const utrMatch = text.match(/(?:UTR|Ref|Txn|Reference)\s*(?:No\.?|ID)?\s*[:\s-]?\s*(\d{12})/i) || text.match(/\b(\d{12})\b/);
  if (utrMatch) {
    utr = utrMatch[1];
  }

  // Match App Name
  if (/gpay|google pay/i.test(text)) appName = "Google Pay";
  else if (/phonepe|phone pe/i.test(text)) appName = "PhonePe";
  else if (/paytm/i.test(text)) appName = "Paytm";
  else if (/bhim/i.test(text)) appName = "BHIM";
  else if (/amazon/i.test(text)) appName = "Amazon Pay";
  else if (/cred/i.test(text)) appName = "Cred";

  // Match Payer / From Name
  const fromMatch = text.match(/(?:from|by)\s+([A-Za-z\s]{2,30})/i);
  if (fromMatch) {
    const rawName = fromMatch[1].trim();
    // Filter out keywords like UPI, A/C, Bank
    if (!/upi|bank|account|ref|utr|credited/i.test(rawName)) {
      payerName = rawName;
    }
  }

  return { amount, utr, payerName, appName };
}

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

    const business = await Business.findById(decoded.businessId);
    
    // Fetch UPI income transactions
    const upiIncomes = await Income.find({
      businessId: decoded.businessId,
      paymentMethod: "UPI",
    }).sort({ date: -1 }).limit(50);

    const totalUpiCollection = upiIncomes.reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      success: true,
      upiVpa: business?.upiId || "",
      merchantName: business?.name || "YR Manager Merchant",
      totalUpiCollection,
      recentUpiTransactions: upiIncomes.map((item) => ({
        _id: item._id.toString(),
        invoiceNumber: item.invoiceNumber,
        amount: item.amount,
        date: item.date.toISOString(),
        notes: item.notes || "",
        paymentStatus: item.paymentStatus,
      })),
    });
  } catch (error: any) {
    console.error("Fetch UPI error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch UPI details" }, { status: 500 });
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

    const body = await request.json();
    const { action, rawText, amount, upiApp, utrNumber, payerName, notes, checklistItemId, upiVpa } = body;

    await connectToDatabase();

    // Action 1: Save/Update Business UPI VPA ID
    if (action === "updateVpa") {
      if (!upiVpa) return NextResponse.json({ error: "UPI VPA ID is required" }, { status: 400 });
      await Business.findByIdAndUpdate(decoded.businessId, { upiId: upiVpa.trim() });
      return NextResponse.json({ success: true, message: "UPI ID updated successfully" });
    }

    // Action 2: Parse raw SMS text
    if (action === "parse") {
      if (!rawText) return NextResponse.json({ error: "SMS or notification text is required" }, { status: 400 });
      const parsed = parseUpiText(rawText);
      return NextResponse.json({ success: true, parsed });
    }

    // Action 3: Log UPI transaction
    const finalAmount = Number(amount);
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      return NextResponse.json({ error: "Valid payment amount is required" }, { status: 400 });
    }

    const app = upiApp || "UPI";
    const refUtr = utrNumber ? utrNumber.trim() : `UPI-${Date.now().toString().slice(-8)}`;
    const customer = payerName ? payerName.trim() : "UPI Customer";

    // 1. Create formal Income record
    const newIncome = new Income({
      invoiceNumber: refUtr.length === 12 ? `UTR-${refUtr}` : refUtr,
      amount: finalAmount,
      paymentStatus: "Paid",
      paymentMethod: "UPI",
      date: new Date(),
      notes: `[${app}] Received from ${customer}${notes ? ` - ${notes}` : ""}`,
      businessId: decoded.businessId,
    });
    await newIncome.save();

    // 2. Optional: If user selected a checklist item, log to Daily Checklist as well
    if (checklistItemId) {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);

      let log = await ChecklistLog.findOne({
        businessId: decoded.businessId,
        checklistItemId,
        date: startOfToday,
      });

      if (log) {
        log.amount += finalAmount;
        log.notes = log.notes ? `${log.notes}; UPI: +₹${finalAmount}` : `UPI: +₹${finalAmount}`;
        await log.save();
      } else {
        log = new ChecklistLog({
          businessId: decoded.businessId,
          checklistItemId,
          amount: finalAmount,
          date: startOfToday,
          notes: `UPI ${app}: +₹${finalAmount}`,
        });
        await log.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully logged ₹${finalAmount} UPI transaction from ${customer}!`,
      income: newIncome,
    });
  } catch (error: any) {
    console.error("UPI Log error:", error);
    return NextResponse.json({ error: error.message || "Failed to log UPI transaction" }, { status: 500 });
  }
}

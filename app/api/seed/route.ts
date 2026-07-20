import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import {
  User,
  Business,
  Customer,
  Service,
  Order,
  Income,
  Expense,
  Inventory,
  Supplier,
  Invoice
} from "@/models";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await connectToDatabase();

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Business.deleteMany({}),
      Customer.deleteMany({}),
      Service.deleteMany({}),
      Order.deleteMany({}),
      Income.deleteMany({}),
      Expense.deleteMany({}),
      Inventory.deleteMany({}),
      Supplier.deleteMany({}),
      Invoice.deleteMany({})
    ]);

    // 1. Create Business
    const business = new Business({
      name: "YR Digital Enterprise",
      address: "100 Gold Arcade, Metro Plaza, Chennai",
      gstin: "33AAAAA1111A1Z1",
      currency: "INR",
    });
    await business.save();

    // 2. Create Default Business Owner User
    const hashedPassword = await bcrypt.hash("password123", 10);
    const owner = new User({
      name: "YR Admin",
      email: "admin@yr.com",
      password: hashedPassword,
      role: "Business Owner",
      businessId: business._id,
    });
    await owner.save();

    // 3. Create Suppliers
    const supplier1 = new Supplier({
      name: "Apex Print Supplies",
      contactName: "Amit Shah",
      phone: "9876500111",
      email: "sales@apex.com",
      businessId: business._id,
    });
    const supplier2 = new Supplier({
      name: "Threads & Fabrics Ltd",
      contactName: "Kavitha S.",
      phone: "9876500222",
      email: "info@threads.com",
      businessId: business._id,
    });
    await Promise.all([supplier1.save(), supplier2.save()]);

    // 4. Create Inventory items (Cyan/Magenta inks, photo papers, flex rolls)
    const inv1 = new Inventory({ itemName: "Flex Roll 10x50", quantity: 12, unit: "Rolls", minThreshold: 5, businessId: business._id });
    const inv2 = new Inventory({ itemName: "Photo Paper A4", quantity: 250, unit: "Sheets", minThreshold: 50, businessId: business._id });
    const inv3 = new Inventory({ itemName: "Cyan Ink Bottle", quantity: 4, unit: "Bottles", minThreshold: 2, businessId: business._id });
    const inv4 = new Inventory({ itemName: "Magenta Ink Bottle", quantity: 1, unit: "Bottles", minThreshold: 2, businessId: business._id }); // Under threshold!
    const inv5 = new Inventory({ itemName: "Yellow Ink Bottle", quantity: 6, unit: "Bottles", minThreshold: 2, businessId: business._id });
    await Promise.all([inv1.save(), inv2.save(), inv3.save(), inv4.save(), inv5.save()]);

    // 5. Create Catalog of Services
    const s1 = new Service({ name: "Website Development", category: "Design", defaultPrice: 25000, costPrice: 5000, businessId: business._id });
    const s2 = new Service({ name: "Invitation Printing", category: "Printing", defaultPrice: 20, costPrice: 8, businessId: business._id });
    const s3 = new Service({ name: "Banner Printing", category: "Printing", defaultPrice: 1500, costPrice: 700, businessId: business._id });
    const s4 = new Service({ name: "Logo Design", category: "Design", defaultPrice: 4500, costPrice: 500, businessId: business._id });
    const s5 = new Service({ name: "Designer Tailoring", category: "Tailoring", defaultPrice: 3500, costPrice: 1000, businessId: business._id });
    await Promise.all([s1.save(), s2.save(), s3.save(), s4.save(), s5.save()]);

    // 6. Create Customers
    const c1 = new Customer({ name: "Rajesh Kumar", email: "rajesh@gmail.com", phone: "9876543210", address: "Adyar, Chennai", outstandingBalance: 4500, businessId: business._id });
    const c2 = new Customer({ name: "Priya Sharma", email: "priya@gmail.com", phone: "9812345678", address: "Nungambakkam, Chennai", outstandingBalance: 0, businessId: business._id });
    const c3 = new Customer({ name: "Ramya Artistry", email: "ramya@artistry.com", phone: "9944332211", address: "T-Nagar, Chennai", outstandingBalance: 12000, businessId: business._id });
    await Promise.all([c1.save(), c2.save(), c3.save()]);

    // 7. Seed Income & Expenses over the last 30 days
    const now = new Date();
    const mockIncomes = [];
    const mockExpenses = [];

    for (let i = 29; i >= 0; i--) {
      const recordDate = new Date();
      recordDate.setDate(now.getDate() - i);

      // Random daily income inputs (UPI, Cash, etc.)
      const amount1 = Math.floor(Math.random() * 8000) + 1500;
      const amount2 = Math.floor(Math.random() * 12000) + 3000;

      mockIncomes.push(
        new Income({
          invoiceNumber: `INV-${recordDate.getFullYear()}${(recordDate.getMonth()+1).toString().padStart(2,"0")}${recordDate.getDate().toString().padStart(2,"0")}-A`,
          customerId: c1._id,
          amount: amount1,
          paymentStatus: "Paid",
          paymentMethod: i % 2 === 0 ? "UPI" : "Cash",
          date: recordDate,
          notes: "Print job delivery",
          businessId: business._id,
        }),
        new Income({
          invoiceNumber: `INV-${recordDate.getFullYear()}${(recordDate.getMonth()+1).toString().padStart(2,"0")}${recordDate.getDate().toString().padStart(2,"0")}-B`,
          customerId: c3._id,
          amount: amount2,
          paymentStatus: "Paid",
          paymentMethod: i % 3 === 0 ? "Bank Transfer" : "UPI",
          date: recordDate,
          notes: "Creative assets design",
          businessId: business._id,
        })
      );

      // Occasional overheads and materials cost
      if (i % 2 === 0) {
        const categories = ["Rent", "Electricity", "Internet", "Fuel", "Ink", "Paper", "Marketing", "Other"];
        const category = categories[i % categories.length];
        let amount = Math.floor(Math.random() * 1500) + 500;
        if (category === "Rent" && i === 28) amount = 15000; // Monthly Rent
        if (category === "Electricity" && i === 14) amount = 4200; // Monthly power bill

        mockExpenses.push(
          new Expense({
            category,
            amount,
            date: recordDate,
            notes: `Regular payment for ${category}`,
            businessId: business._id,
          })
        );
      }
    }

    await Income.insertMany(mockIncomes);
    await Expense.insertMany(mockExpenses);

    // 8. Create Pending (Unpaid) Incomes/Dues
    await new Income({
      invoiceNumber: "INV-DUE-001",
      customerId: c1._id,
      amount: 4500,
      paymentStatus: "Pending",
      paymentMethod: "UPI",
      date: now,
      notes: "Pending balance for logo design",
      businessId: business._id,
    }).save();

    await new Income({
      invoiceNumber: "INV-DUE-002",
      customerId: c3._id,
      amount: 12000,
      paymentStatus: "Pending",
      paymentMethod: "Bank Transfer",
      date: now,
      notes: "Tailoring order pending clearance",
      businessId: business._id,
    }).save();

    // 9. Create Active Orders in progress
    const o1 = new Order({
      orderNumber: "ORD-2026-001",
      customerId: c1._id,
      items: [{ serviceId: s3._id, quantity: 2, unitPrice: 1500, notes: "Banner printing for grand opening" }],
      status: "Production",
      totalAmount: 3000,
      paidAmount: 1500,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // due in 2 days
      businessId: business._id,
    });

    const o2 = new Order({
      orderNumber: "ORD-2026-002",
      customerId: c3._id,
      items: [{ serviceId: s5._id, quantity: 4, unitPrice: 3500, notes: "Embroidery dress tailoring work" }],
      status: "Design",
      totalAmount: 14000,
      paidAmount: 2000,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // due in 5 days
      businessId: business._id,
    });

    await Promise.all([o1.save(), o2.save()]);

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully with YR Business Manager initial records!",
      credentials: {
        email: "admin@yr.com",
        password: "password123",
        business: "YR Digital Enterprise",
      },
    });
  } catch (error: any) {
    console.error("Database seeding error:", error);
    return NextResponse.json({ error: error.message || "Failed to seed database" }, { status: 500 });
  }
}

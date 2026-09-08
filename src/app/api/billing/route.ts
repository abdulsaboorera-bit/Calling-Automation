import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db";
import { Tenant } from "@/lib/models";

export async function GET(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const tenant = await Tenant.findById(context.user.tenantId);

    return NextResponse.json({
      subscription: tenant?.subscription || {
        plan: "free",
        status: "trialing",
        monthlyCallLimit: 100,
        monthlyCallUsage: 0,
        renewalDate: null,
      },
      plans: [
        {
          id: "free",
          name: "Free",
          price: 0,
          callsPerMonth: 100,
          features: ["100 calls/month", "Basic analytics", "1 user"],
        },
        {
          id: "starter",
          name: "Starter",
          price: 49,
          callsPerMonth: 1000,
          features: ["1,000 calls/month", "Advanced analytics", "5 users", "CSV export"],
        },
        {
          id: "professional",
          name: "Professional",
          price: 149,
          callsPerMonth: 5000,
          features: ["5,000 calls/month", "PDF reports", "20 users", "Priority support", "API access"],
        },
        {
          id: "enterprise",
          name: "Enterprise",
          price: 499,
          callsPerMonth: 25000,
          features: ["25,000 calls/month", "Custom branding", "Unlimited users", "Dedicated support", "Custom integrations"],
        },
      ],
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

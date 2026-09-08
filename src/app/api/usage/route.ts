import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db";
import { UsageRecord, Tenant } from "@/lib/models";

export async function GET(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    await connectDB();

    const tenant = await Tenant.findById(context.user.tenantId);
    const currentPeriod = new Date().toISOString().slice(0, 7);

    const usage = await UsageRecord.findOne({
      tenantId: context.user.tenantId,
      period: currentPeriod,
    });

    return NextResponse.json({
      usage: usage || {
        period: currentPeriod,
        aiMinutes: 0,
        telephonyMinutes: 0,
        completedCalls: 0,
        failedCalls: 0,
        totalCalls: 0,
        recordings: 0,
        storageBytes: 0,
        aiAnalysisCount: 0,
        costs: { aiCost: 0, telephonyCost: 0, storageCost: 0, totalCost: 0 },
      },
      subscription: tenant?.subscription || {
        plan: "free",
        monthlyCallLimit: 100,
        monthlyCallUsage: 0,
      },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

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
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }
    return NextResponse.json({ tenant });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const allowedFields = [
      "name", "website", "industry", "phone", "address",
      "timezone", "callingHours", "settings",
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      context.user.tenantId,
      { $set: updates },
      { new: true }
    );
    return NextResponse.json({ tenant });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

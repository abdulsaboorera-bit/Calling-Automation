import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db";
import { PhoneNumber } from "@/lib/models";

export async function GET(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const numbers = await PhoneNumber.find({ tenantId: context.user.tenantId }).sort({ createdAt: -1 });
    return NextResponse.json({ numbers });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const { phoneNumber, friendlyName } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    const existing = await PhoneNumber.findOne({
      tenantId: context.user.tenantId,
      phoneNumber,
    });
    if (existing) {
      return NextResponse.json({ error: "Phone number already added" }, { status: 400 });
    }

    const number = await PhoneNumber.create({
      tenantId: context.user.tenantId,
      phoneNumber,
      friendlyName: friendlyName || phoneNumber,
      provider: "telnyx",
      status: "active",
    });

    return NextResponse.json({ number }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

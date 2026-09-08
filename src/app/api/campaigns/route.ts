import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { campaignService } from "@/lib/services/campaign";

export async function GET(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const filters = Object.fromEntries(searchParams.entries());
    const result = await campaignService.list(context.user.tenantId, filters);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const campaign = await campaignService.create(
      context.user.tenantId,
      body,
      context.user.userId
    );
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

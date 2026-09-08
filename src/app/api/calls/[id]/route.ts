import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { callService } from "@/lib/services/call";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const call = await callService.getById(context.user.tenantId, params.id);
    return NextResponse.json({ call });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}

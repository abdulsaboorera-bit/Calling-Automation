import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { customerService } from "@/lib/services/customer";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const calls = await customerService.getCallHistory(context.user.tenantId, params.id);
    return NextResponse.json({ calls });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

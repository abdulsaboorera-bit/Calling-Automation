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
    const customer = await customerService.getById(context.user.tenantId, params.id);
    return NextResponse.json({ customer });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const customer = await customerService.update(context.user.tenantId, params.id, body);
    return NextResponse.json({ customer });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    await customerService.delete(context.user.tenantId, params.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

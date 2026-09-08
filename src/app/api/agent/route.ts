import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { agentService } from "@/lib/services/agent";

export async function GET(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const agent = await agentService.getById(context.user.tenantId, id);
      return NextResponse.json({ agent });
    }

    const agents = await agentService.list(context.user.tenantId);
    return NextResponse.json({ agents });
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
    const agent = await agentService.create(context.user.tenantId, body);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Agent ID required" }, { status: 400 });
    }
    const agent = await agentService.update(context.user.tenantId, id, updates);
    return NextResponse.json({ agent });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

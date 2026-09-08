import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { campaignService } from "@/lib/services/campaign";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const campaign = await campaignService.getById(context.user.tenantId, params.id);
    return NextResponse.json({ campaign });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { action } = body;

    let campaign;
    switch (action) {
      case "start":
        campaign = await campaignService.start(context.user.tenantId, params.id);
        break;
      case "pause":
        campaign = await campaignService.pause(context.user.tenantId, params.id);
        break;
      case "resume":
        campaign = await campaignService.resume(context.user.tenantId, params.id);
        break;
      case "stop":
        campaign = await campaignService.stop(context.user.tenantId, params.id);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ campaign });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

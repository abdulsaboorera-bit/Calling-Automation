import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { connectDB } from "@/lib/db";
import { Tenant, TenantUser } from "@/lib/models";

export async function GET(request: NextRequest) {
  const { context, error } = await withAuth(request);
  if (error) return error;

  try {
    await connectDB();

    const tenant = await Tenant.findById(context.user.tenantId);

    return NextResponse.json({
      user: {
        id: context.user.userId,
        email: context.user.email,
        role: context.user.role,
      },
      tenant: tenant
        ? {
            id: tenant._id.toString(),
            name: tenant.name,
            slug: tenant.slug,
            subscription: tenant.subscription,
            settings: tenant.settings,
          }
        : null,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

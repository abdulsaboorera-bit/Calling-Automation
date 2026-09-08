import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/auth";
import { setAuthCookie, clearAuthCookie, getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await authService.register(body);

    const response = NextResponse.json({
      success: true,
      user: result.user,
      tenant: result.tenant,
    });

    await setAuthCookie(result.token);

    return response;
  } catch (error: unknown) {
    const err = error as { message?: string };
    return NextResponse.json(
      { error: err.message || "Registration failed" },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }
}

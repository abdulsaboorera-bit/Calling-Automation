import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/auth";
import { setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const result = await authService.login(email, password);

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
      { error: err.message || "Login failed" },
      { status: 401 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, JWTPayload } from "@/lib/auth";

export interface AuthContext {
  user: JWTPayload;
  request: NextRequest;
}

export async function withAuth(
  request: NextRequest
): Promise<{ context: AuthContext; error?: NextResponse }> {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return {
      context: { user: null as unknown as JWTPayload, request },
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return {
      context: { user: null as unknown as JWTPayload, request },
      error: NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }),
    };
  }

  return {
    context: { user: payload, request },
  };
}

export function requireRole(...roles: string[]) {
  return (user: JWTPayload): boolean => {
    return roles.includes(user.role);
  };
}

export function getTenantId(user: JWTPayload): string {
  return user.tenantId;
}

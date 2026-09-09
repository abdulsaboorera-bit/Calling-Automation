import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return NextResponse.json(
      { status: "ok" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Voice] Error:", err.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

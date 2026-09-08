import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = body.data || {};

    const response = {
      data: {
        call_control_id: data.call_control_id || "",
        status: "answered",
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/telnyx`,
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Voice] Error:", err.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

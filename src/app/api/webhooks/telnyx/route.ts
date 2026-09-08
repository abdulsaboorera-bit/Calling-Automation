import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/lib/services/call";
import { getTelnyxProvider } from "@/lib/providers";
import { connectDB } from "@/lib/db";
import { WebhookEvent } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const provider = getTelnyxProvider();
    if (!provider.validateWebhookRequest(headers, JSON.stringify(body), request.url)) {
      console.warn("[Webhook] Invalid Telnyx signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    await connectDB();

    const payload = body as Record<string, unknown>;
    const data = (payload.data as Record<string, unknown>) || {};
    const callControlId = (data.call_control_id as string) || "";
    const eventType = (payload.event_type as string) || "unknown";

    if (callControlId) {
      const existing = await WebhookEvent.findOne({
        provider: "telnyx",
        providerEventId: callControlId,
        "payload.event_type": eventType,
      });

      if (existing) {
        console.log(`[Webhook] Duplicate event for ${callControlId}`);
        return new NextResponse("OK", { status: 200 });
      }

      await WebhookEvent.create({
        provider: "telnyx",
        eventType,
        providerEventId: callControlId,
        payload,
        processed: true,
        processedAt: new Date(),
      });
    }

    const statusMap: Record<string, string> = {
      "call.initiated": "initiated",
      "call.ringing": "ringing",
      "call.answered": "answered",
      "call.hangup": "completed",
      "call.machine.detection.ended": "completed",
      "call.bridged": "answered",
      "call.fallback.ended": "completed",
    };

    const status = statusMap[eventType] || eventType;
    const duration = data.duration_secs ? parseInt(String(data.duration_secs), 10) : undefined;
    const recordingUrl = (data.recording_urls as string[])?.[0] || undefined;

    if (callControlId && status) {
      await callService.handleWebhookStatus(callControlId, status, duration, recordingUrl);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Webhook] Error processing Telnyx webhook:", err.message);
    return new NextResponse("OK", { status: 200 });
  }
}

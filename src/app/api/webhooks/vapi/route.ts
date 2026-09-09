import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/lib/services/call";
import { getVapiProvider } from "@/lib/providers";
import { connectDB } from "@/lib/db";
import { WebhookEvent } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const provider = getVapiProvider();
    if (!provider.validateWebhookRequest(headers, JSON.stringify(body), request.url)) {
      console.warn("[Webhook] Invalid Vapi signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    await connectDB();

    const payload = body as Record<string, unknown>;
    const call = (payload.call as Record<string, unknown>) || {};
    const eventType = (payload.event as string) || "unknown";
    const callId = (call.id as string) || "";

    if (callId) {
      const existing = await WebhookEvent.findOne({
        provider: "vapi",
        providerEventId: callId,
        "payload.event": eventType,
      });

      if (existing) {
        console.log(`[Webhook] Duplicate event for ${callId}`);
        return new NextResponse("OK", { status: 200 });
      }

      await WebhookEvent.create({
        provider: "vapi",
        eventType,
        providerEventId: callId,
        payload,
        processed: true,
        processedAt: new Date(),
      });
    }

    const statusMap: Record<string, string> = {
      "call.queued": "initiated",
      "call.ringing": "ringing",
      "call.in_progress": "answered",
      "call.ended": "completed",
      "call.failed": "failed",
      "call.busy": "busy",
      "call.no-answer": "no_answer",
      "call.machine": "voicemail",
    };

    const status = statusMap[eventType] || eventType;
    const duration = call.duration ? parseInt(String(call.duration), 10) : undefined;
    const recordingUrl = (call.recordingUrl as string) || undefined;

    if (callId && status) {
      await callService.handleWebhookStatus(callId, status, duration, recordingUrl);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Webhook] Error processing Vapi webhook:", err.message);
    return new NextResponse("OK", { status: 200 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/lib/services/call";
import { getVapiProvider } from "@/lib/providers";
import { connectDB } from "@/lib/db";
import { WebhookEvent, Call, AgentConfiguration } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const provider = getVapiProvider();
    if (!provider.validateWebhookRequest(headers, JSON.stringify(body), request.url)) {
      console.warn("[Webhook] Invalid Vapi signature - allowing anyway for development");
    }

    await connectDB();

    const payload = body as Record<string, unknown>;
    const message = (payload.message as Record<string, unknown>) || {};
    const messageType = (message.type as string) || "";
    const callObj = (message.call as Record<string, unknown>) || {};
    const callId = (callObj.id as string) || "";

    console.log(`[Webhook] Received message type: ${messageType}, callId: ${callId}`);

    if (messageType === "assistant-request") {
      console.log(`[Webhook] Handling assistant-request for call ${callId}`);

      let agentConfig = null;
      if (callId) {
        const callDoc = await Call.findOne({ providerCallSid: callId });
        if (callDoc && callDoc.agentConfigurationId) {
          agentConfig = await AgentConfiguration.findById(callDoc.agentConfigurationId);
        }
      }

      if (!agentConfig) {
        agentConfig = await AgentConfiguration.findOne({ isActive: true }).sort({ createdAt: -1 });
      }

      const assistantConfig = {
        assistant: {
          firstMessage: agentConfig?.openingMessage || "Hello, this is an automated call from our team. How are you today?",
          model: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.7,
            messages: agentConfig?.systemPrompt
              ? [{ role: "system", content: agentConfig.systemPrompt }]
              : [],
          },
          voice: agentConfig?.voice || "jessica",
          language: agentConfig?.language || "en",
        },
      };

      console.log(`[Webhook] Responding with assistant config for call ${callId}`);
      return NextResponse.json(assistantConfig, { status: 200 });
    }

    const eventType = (messageType || (payload.event as string)) || "unknown";

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
      "status-update": "status_update",
    };

    const callDuration = callObj.duration ? parseInt(String(callObj.duration), 10) : undefined;
    const recordingUrl = (callObj.recordingUrl as string) || undefined;

    const status = statusMap[eventType] || eventType;

    if (callId && status) {
      await callService.handleWebhookStatus(callId, status, callDuration, recordingUrl);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Webhook] Error processing Vapi webhook:", err.message);
    return new NextResponse("OK", { status: 200 });
  }
}

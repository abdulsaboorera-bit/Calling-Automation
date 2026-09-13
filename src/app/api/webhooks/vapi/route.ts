import { NextRequest, NextResponse } from "next/server";
import { callService } from "@/lib/services/call";
import { getVapiProvider, getOpenAIProvider } from "@/lib/providers";
import { connectDB } from "@/lib/db";
import { WebhookEvent, Call, AgentConfiguration, Customer } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const rawBody = await request.text();
    const provider = getVapiProvider();
    if (!provider.validateWebhookRequest(headers, rawBody, request.url)) {
      console.warn("[Webhook] Invalid Vapi signature");
      if (process.env.NODE_ENV === "production") {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    await connectDB();

    const payload = body as Record<string, unknown>;
    const message = (payload.message as Record<string, unknown>) || {};
    const messageType = (message.type as string) || "";
    const callObj = (message.call as Record<string, unknown>) || {};
    const callId = (callObj.id as string) || "";

    if (messageType === "assistant-request") {
      let agentConfig = null;
      let customerInfo = null;

      if (callId) {
        const callDoc = await Call.findOne({ providerCallSid: callId });
        if (callDoc) {
          if (callDoc.agentConfigurationId) {
            agentConfig = await AgentConfiguration.findById(callDoc.agentConfigurationId);
          }
          if (callDoc.customerId) {
            customerInfo = await Customer.findById(callDoc.customerId);
          }
        }
      }

      if (!agentConfig) {
        agentConfig = await AgentConfiguration.findOne({ isActive: true }).sort({ createdAt: -1 });
      }

      let systemPrompt = agentConfig?.systemPrompt || "";
      if (!systemPrompt && agentConfig) {
        const openai = getOpenAIProvider();
        systemPrompt = openai.generateSystemPrompt({
          companyName: agentConfig.companyName,
          businessDescription: agentConfig.businessDescription,
          agentName: agentConfig.agentName,
          tone: agentConfig.tone,
          openingMessage: agentConfig.openingMessage,
          feedbackQuestions: agentConfig.feedbackQuestions,
          closingMessage: agentConfig.closingMessage,
          customerInfo: customerInfo ? {
            firstName: (customerInfo as Record<string, unknown>).firstName,
            lastName: (customerInfo as Record<string, unknown>).lastName,
            service: (customerInfo as Record<string, unknown>).service,
            serviceDate: (customerInfo as Record<string, unknown>).serviceDate,
            vehicleYear: (customerInfo as Record<string, unknown>).vehicleYear,
            vehicleMake: (customerInfo as Record<string, unknown>).vehicleMake,
            vehicleModel: (customerInfo as Record<string, unknown>).vehicleModel,
          } : undefined,
        });
      }

      const assistantConfig = {
        assistant: {
          firstMessage: agentConfig?.openingMessage || "Hello, this is an automated call from our team. How are you today?",
          model: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.7,
            messages: systemPrompt
              ? [{ role: "system", content: systemPrompt }]
              : [],
          },
          voice: agentConfig?.voice || "jessica",
          language: agentConfig?.language || "en",
        },
      };

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

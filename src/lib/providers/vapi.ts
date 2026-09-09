import {
  TelephonyProvider,
  CallInitiationParams,
  CallInitiationResult,
  CallStatusResult,
  WebhookPayload,
  NumberConfig,
} from "./telephony";

const VAPI_API_KEY = process.env.VAPI_API_KEY || "";
const VAPI_API_BASE = "https://api.vapi.ai";

export class VapiProvider extends TelephonyProvider {
  name = "vapi";

  constructor() {
    super();
    if (!VAPI_API_KEY) {
      console.warn("[Vapi] API key not configured");
    }
  }

  private async request(path: string, method: string, body?: unknown) {
    const response = await fetch(`${VAPI_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Vapi API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async initiateCall(params: CallInitiationParams): Promise<CallInitiationResult> {
    try {
      const assistantId = process.env.VAPI_ASSISTANT_ID || "";
      const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID || "";

      const result = await this.request("/call/phone", "POST", {
        assistantId,
        phoneNumberId,
        customer: {
          number: params.to,
        },
        metadata: {
          tenantId: params.tenantId,
          callId: params.callId,
        },
      });

      return {
        providerCallSid: result.id || "",
        status: result.status || "queued",
        provider: "vapi",
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[Vapi] Call initiation failed:", err.message);
      throw new Error(`Vapi call failed: ${err.message}`);
    }
  }

  async hangupCall(providerCallSid: string): Promise<void> {
    try {
      await this.request(`/call/${providerCallSid}/hangup`, "POST");
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[Vapi] Call hangup failed:", err.message);
      throw new Error(`Vapi hangup failed: ${err.message}`);
    }
  }

  async getCallStatus(providerCallSid: string): Promise<CallStatusResult> {
    try {
      const result = await this.request(`/call/${providerCallSid}`, "GET");

      const statusMap: Record<string, string> = {
        queued: "queued",
        ringing: "ringing",
        in_progress: "in_progress",
        forward: "in_progress",
        ended: "completed",
        failed: "failed",
        busy: "busy",
        "no-answer": "no_answer",
        machine: "voicemail",
        canceled: "cancelled",
      };

      const rawStatus = result.status || "unknown";
      const mappedStatus = statusMap[rawStatus] || rawStatus;

      return {
        providerCallSid: result.id || providerCallSid,
        status: mappedStatus,
        duration: result.duration ? parseInt(String(result.duration), 10) : undefined,
        recordingUrl: result.recordingUrl || undefined,
        direction: "outbound",
        from: result.phoneNumberId || undefined,
        to: result.customer?.number || undefined,
        errorCode: result.error ? String(result.error) : undefined,
        errorMessage: result.errorMessage || undefined,
        startTime: result.createdAt ? new Date(result.createdAt) : undefined,
        endTime: result.endedAt ? new Date(result.endedAt) : undefined,
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[Vapi] Get status failed:", err.message);
      throw new Error(`Vapi status fetch failed: ${err.message}`);
    }
  }

  async handleWebhook(
    headers: Record<string, string>,
    body: unknown
  ): Promise<WebhookPayload> {
    const payload = body as Record<string, unknown>;
    const eventType = (payload.event as string) || "unknown";
    const call = (payload.call as Record<string, unknown>) || {};

    const eventMap: Record<string, string> = {
      "call.queued": "call.initiated",
      "call.ringing": "call.ringing",
      "call.in_progress": "call.answered",
      "call.ended": "call.completed",
      "call.failed": "call.failed",
      "call.busy": "call.busy",
      "call.no-answer": "call.no_answer",
      "call.machine": "call.voicemail",
    };

    const event = eventMap[eventType] || `call.${eventType}`;

    return {
      event,
      callSid: (call.id as string) || "",
      callStatus: eventType,
      from: (call.phoneNumberId as string) || undefined,
      to: (call.customer as Record<string, unknown>)?.number as string | undefined,
      direction: "outbound",
      duration: call.duration ? String(call.duration) : undefined,
      recordingUrl: (call.recordingUrl as string) || undefined,
      errorCode: call.error ? String(call.error) : undefined,
      errorMessage: (call.errorMessage as string) || undefined,
      metadata: {
        assistantId: (call.assistantId as string) || "",
        transcript: (call.transcript as string) || "",
      },
      timestamp: new Date(),
      rawBody: payload,
    };
  }

  async configureNumber(
    phoneNumber: string,
    config: Record<string, unknown>
  ): Promise<NumberConfig> {
    return {
      phoneNumber,
      friendlyName: (config.friendlyName as string) || phoneNumber,
      capabilities: {
        voice: true,
        sms: false,
        mms: false,
      },
      providerNumberSid: phoneNumber,
    };
  }

  async transferCall(providerCallSid: string, transferTo: string): Promise<void> {
    try {
      await this.request(`/call/${providerCallSid}/transfer`, "POST", {
        destination: transferTo,
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[Vapi] Call transfer failed:", err.message);
      throw new Error(`Vapi transfer failed: ${err.message}`);
    }
  }

  validateWebhookRequest(
    headers: Record<string, string>,
    body: string,
    _url: string
  ): boolean {
    const signature = headers["x-vapi-signature"] || "";
    if (!signature) {
      return false;
    }
    return signature.length > 0;
  }
}

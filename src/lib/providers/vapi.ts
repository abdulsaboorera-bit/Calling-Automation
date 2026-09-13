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

function toE164(phone: string): string {
  let cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return "+" + cleaned.slice(2);
  if (cleaned.startsWith("0") && cleaned.length >= 10) return "+92" + cleaned.slice(1);
  if (cleaned.startsWith("92") && cleaned.length >= 10) return "+" + cleaned;
  if (cleaned.length === 10) return "+92" + cleaned;
  return "+" + cleaned;
}

export class VapiProvider extends TelephonyProvider {
  name = "vapi";

  constructor() {
    super();
    if (!VAPI_API_KEY) {
      console.warn("[Vapi] API key not configured");
    }
  }

  private async request(path: string, method: string, body?: unknown) {
    const url = `${VAPI_API_BASE}${path}`;
    console.log(`[Vapi] ${method} ${url}`);
    if (body) {
      console.log(`[Vapi] Request body:`, JSON.stringify(body));
    }

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`[Vapi] Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error(`[Vapi] Error response:`, JSON.stringify(error));
      throw new Error(`Vapi API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log(`[Vapi] Success response:`, JSON.stringify(data));
    return data;
  }

  async initiateCall(params: CallInitiationParams): Promise<CallInitiationResult> {
    try {
      const assistantId = process.env.VAPI_ASSISTANT_ID || "";
      const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID || "";

      const customerNumber = toE164(params.to);
      console.log(`[Vapi] Initiating call: assistantId=${assistantId}, phoneNumberId=${phoneNumberId}, to=${customerNumber}`);

      const result = await this.request("/call/phone", "POST", {
        assistantId,
        phoneNumberId,
        customer: {
          number: customerNumber,
        },
        metadata: {
          tenantId: params.tenantId,
          callId: params.callId,
        },
      });

      console.log(`[Vapi] Call initiated successfully:`, JSON.stringify(result));

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
      console.warn("[Vapi] No webhook signature header found, allowing request");
      return true;
    }
    return signature.length > 0;
  }
}

import {
  TelephonyProvider,
  CallInitiationParams,
  CallInitiationResult,
  CallStatusResult,
  WebhookPayload,
  NumberConfig,
} from "./telephony";

const TELNYX_API_BASE = "https://api.telnyx.com/v2";

export class TelnyxProvider extends TelephonyProvider {
  name = "telnyx";
  private apiKey: string;
  private connectionId: string;

  constructor() {
    super();
    this.apiKey = process.env.TELNYX_API_KEY || "";
    this.connectionId = process.env.TELNYX_CONNECTION_ID || "";
    if (!this.apiKey || !this.connectionId) {
      console.warn("[Telnyx] Credentials not configured");
    }
  }

  private async request(path: string, method: string, body?: unknown) {
    const response = await fetch(`${TELNYX_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Telnyx API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  async initiateCall(params: CallInitiationParams): Promise<CallInitiationResult> {
    try {
      const webhookUrl = params.statusCallbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/telnyx`;

      const result = await this.request("/calls", "POST", {
        connection_id: this.connectionId,
        to: params.to,
        from: params.from,
        webhook_url: webhookUrl,
        webhook_timeout_secs: 30,
        answering_machine_detection: "detect",
        custom_headers: [
          { name: "X-Tenant-ID", value: params.tenantId },
          { name: "X-Call-ID", value: params.callId },
        ],
      });

      const callControlId = result.data?.call_control_id || "";
      const state = result.data?.state || "queued";

      return {
        providerCallSid: callControlId,
        status: state,
        provider: "telnyx",
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[Telnyx] Call initiation failed:", err.message);
      throw new Error(`Telnyx call failed: ${err.message}`);
    }
  }

  async hangupCall(providerCallSid: string): Promise<void> {
    try {
      await this.request(`/calls/${providerCallSid}/actions/hangup`, "POST");
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[Telnyx] Call hangup failed:", err.message);
      throw new Error(`Telnyx hangup failed: ${err.message}`);
    }
  }

  async getCallStatus(providerCallSid: string): Promise<CallStatusResult> {
    try {
      const result = await this.request(`/calls/${providerCallSid}`, "GET");
      const data = result.data || {};

      return {
        providerCallSid: data.call_control_id || providerCallSid,
        status: data.state || "unknown",
        duration: data.duration_secs ? parseInt(String(data.duration_secs), 10) : undefined,
        answerDuration: data.answer_secs ? parseInt(String(data.answer_secs), 10) : undefined,
        recordingUrl: (data.recording_urls as string[] | undefined)?.[0] || undefined,
        direction: data.direction,
        from: data.from,
        to: data.to,
        errorCode: data.error_code ? String(data.error_code) : undefined,
        errorMessage: data.error_message || undefined,
        startTime: data.created_at ? new Date(data.created_at) : undefined,
        endTime: data.ended_at ? new Date(data.ended_at) : undefined,
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[Telnyx] Get status failed:", err.message);
      throw new Error(`Telnyx status fetch failed: ${err.message}`);
    }
  }

  async handleWebhook(
    headers: Record<string, string>,
    body: unknown
  ): Promise<WebhookPayload> {
    const payload = body as Record<string, unknown>;
    const eventType = (payload.event_type as string) || "unknown";
    const data = (payload.data as Record<string, unknown>) || {};

    const eventMap: Record<string, string> = {
      "call.initiated": "call.initiated",
      "call.ringing": "call.ringing",
      "call.answered": "call.answered",
      "call.hangup": "call.completed",
      "call.machine.detection.ended": "call.completed",
      "call.bridged": "call.answered",
      "call.fallback.ended": "call.completed",
    };

    const event = eventMap[eventType] || `call.${eventType}`;

    return {
      event,
      callSid: (data.call_control_id as string) || "",
      callStatus: eventType,
      from: (data.from as string) || undefined,
      to: (data.to as string) || undefined,
      direction: (data.direction as string) || undefined,
      duration: data.duration_secs ? String(data.duration_secs) : undefined,
      recordingUrl: (data.recording_urls as string[] | undefined)?.[0] || undefined,
      errorCode: data.error_code ? String(data.error_code) : undefined,
      errorMessage: (data.error_message as string) || undefined,
      metadata: {
        connectionId: (data.connection_id as string) || "",
        sipCallId: (data.sip_call_id as string) || "",
      },
      timestamp: new Date(),
      rawBody: payload,
    };
  }

  async configureNumber(
    phoneNumber: string,
    config: Record<string, unknown>
  ): Promise<NumberConfig> {
    try {
      const numbers = await this.request(
        `/phone_numbers?filter[phone_number]=${encodeURIComponent(phoneNumber)}&filter[status]=active&page[size]=1`,
        "GET"
      );

      const number = numbers.data?.[0];
      if (!number) {
        throw new Error("Phone number not found in Telnyx account");
      }

      const voiceUrl = (config.voiceUrl as string) || "";
      const statusCallbackUrl = (config.statusCallbackUrl as string) || "";

      if (voiceUrl || statusCallbackUrl) {
        await this.request(`/phone_numbers/${number.id}`, "PATCH", {
          voice: {
            call_connection_id: this.connectionId,
            webhook_url: voiceUrl || undefined,
            status_callback_url: statusCallbackUrl || undefined,
          },
        });
      }

      return {
        phoneNumber: number.phone_number,
        friendlyName: number.friendly_name || number.phone_number,
        capabilities: {
          voice: true,
          sms: number.capabilities?.sms || false,
          mms: number.capabilities?.mms || false,
        },
        providerNumberSid: number.id,
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[Telnyx] Number configuration failed:", err.message);
      throw new Error(`Telnyx number config failed: ${err.message}`);
    }
  }

  async transferCall(providerCallSid: string, transferTo: string): Promise<void> {
    try {
      await this.request(`/calls/${providerCallSid}/actions/transfer`, "POST", {
        to: transferTo,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/telnyx`,
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error("[Telnyx] Call transfer failed:", err.message);
      throw new Error(`Telnyx transfer failed: ${err.message}`);
    }
  }

  validateWebhookRequest(
    headers: Record<string, string>,
    body: string,
    _url: string
  ): boolean {
    const telnyxSignature = headers["telnyx-signature"] || headers["x-telnyx-signature"] || "";
    if (!telnyxSignature) {
      return false;
    }

    return telnyxSignature.length > 0;
  }
}

export interface CallInitiationParams {
  tenantId: string;
  callId: string;
  from: string;
  to: string;
  webhookUrl: string;
  statusCallbackUrl: string;
  recordingEnabled?: boolean;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface CallInitiationResult {
  providerCallSid: string;
  status: string;
  provider: string;
}

export interface CallStatusResult {
  providerCallSid: string;
  status: string;
  duration?: number;
  answerDuration?: number;
  recordingUrl?: string;
  direction?: string;
  from?: string;
  to?: string;
  errorCode?: string;
  errorMessage?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface WebhookPayload {
  event: string;
  callSid: string;
  callStatus?: string;
  from?: string;
  to?: string;
  direction?: string;
  duration?: string;
  recordingUrl?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, string>;
  timestamp: Date;
  rawBody: Record<string, unknown>;
}

export interface NumberConfig {
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  providerNumberSid: string;
}

export abstract class TelephonyProvider {
  abstract name: string;

  abstract initiateCall(params: CallInitiationParams): Promise<CallInitiationResult>;

  abstract hangupCall(providerCallSid: string): Promise<void>;

  abstract getCallStatus(providerCallSid: string): Promise<CallStatusResult>;

  abstract handleWebhook(headers: Record<string, string>, body: unknown): Promise<WebhookPayload>;

  abstract configureNumber(phoneNumber: string, config: Record<string, unknown>): Promise<NumberConfig>;

  abstract transferCall(providerCallSid: string, transferTo: string): Promise<void>;

  abstract validateWebhookRequest(headers: Record<string, string>, body: string, url: string): boolean;
}

export type TelephonyProviderFactory = () => TelephonyProvider;

export { TelephonyProvider, type CallInitiationParams, type CallInitiationResult, type CallStatusResult, type WebhookPayload, type NumberConfig } from "./telephony";
export { TelnyxProvider } from "./telnyx";

export { AIProvider, type AICompletionRequest, type AICompletionResponse, type AIAnalysisResult, type AIToolDefinition, type AIToolCall } from "./ai";
export { OpenAIProvider } from "./openai";

export { type StorageProvider, type UploadResult } from "./storage";

import { TelnyxProvider } from "./telnyx";
import { OpenAIProvider } from "./openai";

let telnyxInstance: TelnyxProvider | null = null;
let openaiInstance: OpenAIProvider | null = null;

export function getTelnyxProvider(): TelnyxProvider {
  if (!telnyxInstance) {
    telnyxInstance = new TelnyxProvider();
  }
  return telnyxInstance;
}

export function getOpenAIProvider(): OpenAIProvider {
  if (!openaiInstance) {
    openaiInstance = new OpenAIProvider();
  }
  return openaiInstance;
}

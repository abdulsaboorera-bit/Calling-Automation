export { TelephonyProvider, type CallInitiationParams, type CallInitiationResult, type CallStatusResult, type WebhookPayload, type NumberConfig } from "./telephony";
export { VapiProvider } from "./vapi";

export { AIProvider, type AICompletionRequest, type AICompletionResponse, type AIAnalysisResult, type AIToolDefinition, type AIToolCall } from "./ai";
export { OpenAIProvider } from "./openai";

export { type StorageProvider, type UploadResult } from "./storage";

import { VapiProvider } from "./vapi";
import { OpenAIProvider } from "./openai";

let vapiInstance: VapiProvider | null = null;
let openaiInstance: OpenAIProvider | null = null;

export function getVapiProvider(): VapiProvider {
  if (!vapiInstance) {
    vapiInstance = new VapiProvider();
  }
  return vapiInstance;
}

export function getOpenAIProvider(): OpenAIProvider {
  if (!openaiInstance) {
    openaiInstance = new OpenAIProvider();
  }
  return openaiInstance;
}

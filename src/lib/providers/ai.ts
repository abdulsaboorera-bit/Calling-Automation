export interface AIMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface AIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  tools?: AIToolDefinition[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

export interface AICompletionResponse {
  message: AIMessage;
  toolCalls: AIToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

export interface AIAnalysisResult {
  sentiment: "positive" | "neutral" | "negative";
  satisfactionScore: number;
  recommendationScore: number;
  positiveFeedback: string[];
  negativeFeedback: string[];
  complaintDetected: boolean;
  complaintCategory?: string;
  complaintSeverity?: "low" | "medium" | "high" | "critical";
  problemDescription?: string;
  requestedFollowUp: boolean;
  callbackRequested: boolean;
  doNotCallRequested: boolean;
  customerIntent: string;
  summary: string;
  keyIssues: string[];
  recommendedBusinessAction: string;
}

export abstract class AIProvider {
  abstract name: string;

  abstract chatCompletion(request: AICompletionRequest): Promise<AICompletionResponse>;

  abstract analyzeCall(transcript: string, context: Record<string, unknown>): Promise<AIAnalysisResult>;

  abstract generateSystemPrompt(config: {
    companyName: string;
    businessDescription: string;
    agentName: string;
    tone: string;
    openingMessage: string;
    feedbackQuestions: string[];
    closingMessage: string;
    customerInfo?: Record<string, unknown>;
    serviceInfo?: Record<string, unknown>;
  }): string;
}

export type AIProviderFactory = () => AIProvider;

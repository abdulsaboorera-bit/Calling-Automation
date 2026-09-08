import OpenAI from "openai";
import {
  AIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
  AIToolDefinition,
  AIAnalysisResult,
} from "./ai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
    satisfactionScore: { type: "number", minimum: 1, maximum: 10 },
    recommendationScore: { type: "number", minimum: 1, maximum: 10 },
    positiveFeedback: { type: "array", items: { type: "string" } },
    negativeFeedback: { type: "array", items: { type: "string" } },
    complaintDetected: { type: "boolean" },
    complaintCategory: { type: "string" },
    complaintSeverity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    problemDescription: { type: "string" },
    requestedFollowUp: { type: "boolean" },
    callbackRequested: { type: "boolean" },
    doNotCallRequested: { type: "boolean" },
    customerIntent: { type: "string" },
    summary: { type: "string" },
    keyIssues: { type: "array", items: { type: "string" } },
    recommendedBusinessAction: { type: "string" },
  },
  required: [
    "sentiment", "satisfactionScore", "recommendationScore",
    "positiveFeedback", "negativeFeedback", "complaintDetected",
    "requestedFollowUp", "callbackRequested", "doNotCallRequested",
    "customerIntent", "summary", "keyIssues", "recommendedBusinessAction",
  ],
};

export class OpenAIProvider extends AIProvider {
  name = "openai";
  private client: OpenAI;

  constructor() {
    super();
    if (!OPENAI_API_KEY) {
      console.warn("[OpenAI] API key not configured");
    }
    this.client = new OpenAI({ apiKey: OPENAI_API_KEY });
  }

  async chatCompletion(request: AICompletionRequest): Promise<AICompletionResponse> {
    const messages = request.messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: request.model || "gpt-4o",
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 2048,
    };

    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map((t) => ({
        type: "function" as const,
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));

      if (request.toolChoice) {
        params.tool_choice =
          request.toolChoice === "auto"
            ? "auto"
            : request.toolChoice === "none"
            ? "none"
            : request.toolChoice;
      }
    }

    const response = await this.client.chat.completions.create(params);

    const choice = response.choices[0];
    const message = choice.message;

    const toolCalls = (message.tool_calls || []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));

    return {
      message: {
        role: "assistant",
        content: message.content || "",
      },
      toolCalls,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      model: response.model,
    };
  }

  async analyzeCall(
    transcript: string,
    context: Record<string, unknown>
  ): Promise<AIAnalysisResult> {
    const systemPrompt = `You are an expert customer feedback analyst. Analyze the following customer service call transcript and extract structured feedback data.

Context about the business:
- Company: ${context.companyName || "Unknown"}
- Service: ${context.service || "Unknown"}
- Service Date: ${context.serviceDate || "Unknown"}

Return your analysis as a valid JSON object matching this exact schema. Do not include any text outside the JSON.`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Please analyze this call transcript and return structured JSON:\n\n${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content) as AIAnalysisResult;

    return this.validateAnalysis(parsed);
  }

  generateSystemPrompt(config: {
    companyName: string;
    businessDescription: string;
    agentName: string;
    tone: string;
    openingMessage: string;
    feedbackQuestions: string[];
    closingMessage: string;
    customerInfo?: Record<string, unknown>;
    serviceInfo?: Record<string, unknown>;
  }): string {
    let prompt = `You are ${config.agentName}, a professional AI assistant calling on behalf of ${config.companyName}.

About the business: ${config.businessDescription}

Your role is to conduct a customer feedback call. Be ${config.tone} and conversational. Speak naturally, not like a robot.

IMPORTANT RULES:
- Do NOT pressure the customer to give positive feedback
- If a customer expresses dissatisfaction, acknowledge their concern empathetically
- Collect specific details about any issues
- If a customer says they don't want to receive calls again, immediately say goodbye and mark them as Do Not Call
- If a customer requests a callback, save that request
- Keep the conversation focused but natural
- Use the customer's name when they provide it
- Do not ask more than 6-7 questions total
- Adapt based on the customer's responses
- End the call politely if the customer seems busy or uninterested

STARTING MESSAGE: ${config.openingMessage.replace(/\{companyName\}/g, config.companyName)}

QUESTIONS TO ASK (adapt naturally, don't read verbatim):
${config.feedbackQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

CLOSING MESSAGE: ${config.closingMessage.replace(/\{companyName\}/g, config.companyName)}`;

    if (config.customerInfo) {
      prompt += `\n\nCUSTOMER INFO (use naturally if relevant):
- Name: ${config.customerInfo.firstName || ""} ${config.customerInfo.lastName || ""}
- Service: ${config.customerInfo.service || "recent service"}
- Service Date: ${config.customerInfo.serviceDate || "recently"}
- Vehicle: ${config.customerInfo.vehicleYear || ""} ${config.customerInfo.vehicleMake || ""} ${config.customerInfo.vehicleModel || ""}`.trim();
    }

    if (config.serviceInfo) {
      prompt += `\n\nSERVICE DETAILS: ${JSON.stringify(config.serviceInfo)}`;
    }

    return prompt;
  }

  private validateAnalysis(data: AIAnalysisResult): AIAnalysisResult {
    const validSentiments = ["positive", "neutral", "negative"];
    if (!validSentiments.includes(data.sentiment)) {
      data.sentiment = "neutral";
    }

    data.satisfactionScore = Math.max(1, Math.min(10, Math.round(data.satisfactionScore || 5)));
    data.recommendationScore = Math.max(1, Math.min(10, Math.round(data.recommendationScore || 5)));

    if (!Array.isArray(data.positiveFeedback)) data.positiveFeedback = [];
    if (!Array.isArray(data.negativeFeedback)) data.negativeFeedback = [];
    if (!Array.isArray(data.keyIssues)) data.keyIssues = [];

    if (typeof data.complaintDetected !== "boolean") data.complaintDetected = false;

    if (data.complaintDetected) {
      const validSeverities = ["low", "medium", "high", "critical"];
      if (!validSeverities.includes(data.complaintSeverity || "")) {
        data.complaintSeverity = "medium";
      }
    }

    if (typeof data.requestedFollowUp !== "boolean") data.requestedFollowUp = false;
    if (typeof data.callbackRequested !== "boolean") data.callbackRequested = false;
    if (typeof data.doNotCallRequested !== "boolean") data.doNotCallRequested = false;

    if (!data.customerIntent) data.customerIntent = "feedback";
    if (!data.summary) data.summary = "Customer feedback call completed.";
    if (!data.recommendedBusinessAction) data.recommendedBusinessAction = "Review customer feedback.";

    return data;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Call, AgentConfiguration } from "@/lib/models";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const callId = request.headers.get("x-call-id") || "";

    await connectDB();

    let agentConfig = null;
    if (callId) {
      const call = await Call.findById(callId);
      if (call && call.agentConfigurationId) {
        agentConfig = await AgentConfiguration.findById(call.agentConfigurationId);
      }
    }

    const firstMessage = agentConfig?.openingMessage || "Hello, this is an automated call from our team. How are you today?";

    return NextResponse.json(
      {
        assistant: {
          firstMessage,
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
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[Voice] Error:", err.message);
    return NextResponse.json(
      {
        assistant: {
          firstMessage: "Hello, how are you today?",
          model: {
            provider: "openai",
            model: "gpt-4o",
          },
        },
      },
      { status: 200 }
    );
  }
}

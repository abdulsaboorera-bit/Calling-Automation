import { connectDB } from "@/lib/db";
import { AgentConfiguration } from "@/lib/models";
import { AgentConfigurationSchema } from "@/lib/validators";

export class AgentService {
  async create(tenantId: string, input: Record<string, unknown>) {
    await connectDB();
    const validated = AgentConfigurationSchema.parse(input);

    const agent = await AgentConfiguration.create({
      tenantId,
      ...validated,
    });

    return agent;
  }

  async getById(tenantId: string, agentId: string) {
    await connectDB();
    const agent = await AgentConfiguration.findOne({ _id: agentId, tenantId });
    if (!agent) {
      throw new Error("Agent configuration not found");
    }
    return agent;
  }

  async list(tenantId: string) {
    await connectDB();
    const agents = await AgentConfiguration.find({ tenantId }).sort({ createdAt: -1 });
    return agents;
  }

  async update(tenantId: string, agentId: string, input: Record<string, unknown>) {
    await connectDB();
    const agent = await AgentConfiguration.findOneAndUpdate(
      { _id: agentId, tenantId },
      { $set: input },
      { new: true }
    );
    if (!agent) {
      throw new Error("Agent configuration not found");
    }
    return agent;
  }

  async delete(tenantId: string, agentId: string) {
    await connectDB();
    const agent = await AgentConfiguration.findOneAndUpdate(
      { _id: agentId, tenantId },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!agent) {
      throw new Error("Agent configuration not found");
    }
    return agent;
  }

  async setActive(tenantId: string, agentId: string) {
    await connectDB();
    await AgentConfiguration.updateMany({ tenantId }, { $set: { isActive: false } });
    const agent = await AgentConfiguration.findOneAndUpdate(
      { _id: agentId, tenantId },
      { $set: { isActive: true } },
      { new: true }
    );
    if (!agent) {
      throw new Error("Agent configuration not found");
    }
    return agent;
  }

  getTools() {
    return [
      {
        name: "get_customer",
        description: "Get customer information by customer ID",
        parameters: {
          type: "object",
          properties: {
            customerId: { type: "string", description: "The customer ID" },
          },
          required: ["customerId"],
        },
      },
      {
        name: "save_feedback",
        description: "Save customer feedback after collecting it during the call",
        parameters: {
          type: "object",
          properties: {
            satisfactionScore: { type: "number", minimum: 1, maximum: 10 },
            recommendationScore: { type: "number", minimum: 1, maximum: 10 },
            positiveFeedback: { type: "array", items: { type: "string" } },
            negativeFeedback: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
          },
          required: ["satisfactionScore", "recommendationScore", "summary"],
        },
      },
      {
        name: "create_complaint",
        description: "Create a complaint record when the customer reports an issue",
        parameters: {
          type: "object",
          properties: {
            category: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            description: { type: "string" },
          },
          required: ["category", "severity", "description"],
        },
      },
      {
        name: "request_callback",
        description: "Save a callback request when the customer asks to be called back",
        parameters: {
          type: "object",
          properties: {
            preferredTime: { type: "string" },
            reason: { type: "string" },
          },
          required: ["reason"],
        },
      },
      {
        name: "mark_do_not_call",
        description: "Mark a customer as Do Not Call when they request to stop receiving calls",
        parameters: {
          type: "object",
          properties: {
            reason: { type: "string" },
          },
          required: ["reason"],
        },
      },
      {
        name: "update_call_status",
        description: "Update the current call status",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string" },
          },
          required: ["status"],
        },
      },
      {
        name: "end_call",
        description: "End the current call",
        parameters: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
          required: [],
        },
      },
    ];
  }
}

export const agentService = new AgentService();

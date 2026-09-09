import { connectDB } from "@/lib/db";
import { Call, Campaign, Customer, Feedback, Complaint, CallbackRequest, Tenant, AgentConfiguration } from "@/lib/models";
import { CallFilterSchema } from "@/lib/validators";
import { escapeRegex } from "@/lib/utils";
import { getVapiProvider, getOpenAIProvider, type AIAnalysisResult } from "@/lib/providers";
import { addAnalysisJob, addRetryJob, CallJobData } from "@/lib/queue";

export class CallService {
  async initiateCall(jobData: CallJobData) {
    await connectDB();

    const [call, agentConfig] = await Promise.all([
      Call.findById(jobData.callId),
      AgentConfiguration.findById(jobData.agentConfigurationId),
    ]);

    if (!call) {
      throw new Error(`Call ${jobData.callId} not found`);
    }

    if (call.status !== "queued" && call.status !== "pending") {
      return;
    }

    const campaign = await Campaign.findById(jobData.campaignId);
    if (!campaign || campaign.status !== "running") {
      await Call.findByIdAndUpdate(call._id, { status: "cancelled" });
      return;
    }

    const customer = await Customer.findById(jobData.customerId);
    if (!customer || customer.doNotCall) {
      await Call.findByIdAndUpdate(call._id, { status: "do_not_call", doNotCall: true });
      return;
    }

    try {
      await Call.findByIdAndUpdate(call._id, {
        status: "initiating",
        startedAt: new Date(),
      });

      const webhookBase = process.env.NEXT_PUBLIC_APP_URL!;
      const statusCallbackUrl = `${webhookBase}/api/webhooks/vapi`;
      const voiceUrl = `${webhookBase}/api/vapi/voice`;

      const provider = getVapiProvider();
      const result = await provider.initiateCall({
        tenantId: jobData.tenantId,
        callId: jobData.callId,
        from: jobData.from,
        to: jobData.to,
        webhookUrl: voiceUrl,
        statusCallbackUrl,
        recordingEnabled: (call.metadata as Record<string, unknown>)?.recordingEnabled as boolean || false,
      });

      await Call.findByIdAndUpdate(call._id, {
        providerCallSid: result.providerCallSid,
        status: "ringing",
        provider: "vapi",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(`[Call] Failed to initiate call ${jobData.callId}:`, err.message);

      await Call.findByIdAndUpdate(call._id, {
        status: "failed",
        error: err.message,
      });

      await this.handleCallFailed(jobData, err.message || "Unknown error");
    }
  }

  async handleWebhookStatus(callSid: string, status: string, duration?: number, recordingUrl?: string) {
    await connectDB();

    const call = await Call.findOne({ providerCallSid: callSid });
    if (!call) {
      console.warn(`[Call] No call found for SID ${callSid}`);
      return;
    }

    const statusMap: Record<string, string> = {
      "initiated": "initiating",
      "ringing": "ringing",
      "answered": "answered",
      "in-progress": "in_progress",
      "completed": "completed",
      "busy": "busy",
      "no-answer": "no_answer",
      "voicemail": "voicemail",
      "failed": "failed",
    };

    const mappedStatus = statusMap[status] || status;
    const updateData: Record<string, unknown> = {
      providerStatus: status,
      status: mappedStatus,
    };

    if (duration) {
      updateData.duration = duration;
    }

    if (recordingUrl) {
      updateData.recordingUrl = recordingUrl;
    }

    if (mappedStatus === "answered" || mappedStatus === "in_progress") {
      updateData.answeredAt = new Date();
    }

    if (["completed", "no_answer", "busy", "voicemail", "failed"].includes(mappedStatus)) {
      updateData.completedAt = new Date();
    }

    await Call.findByIdAndUpdate(call._id, updateData);

    if (mappedStatus === "completed" && call.campaignId) {
      await this.updateCampaignCounts(call.campaignId.toString(), "completed");
      await this.triggerAnalysis(call);
    } else if (["no_answer", "busy", "voicemail"].includes(mappedStatus)) {
      await this.updateCampaignCounts(call.campaignId.toString(), mappedStatus as string);
      await this.handleCallFailed(
        {
          tenantId: call.tenantId.toString(),
          campaignId: call.campaignId.toString(),
          callId: call._id.toString(),
          customerId: call.customerId.toString(),
          phoneNumberId: call.phoneNumberId.toString(),
          agentConfigurationId: call.agentConfigurationId.toString(),
          from: call.fromNumber,
          to: call.toNumber,
          retryCount: call.retryCount,
          maxRetries: call.maxRetries,
        },
        `Call ${mappedStatus}`
      );
    } else if (mappedStatus === "failed") {
      await this.updateCampaignCounts(call.campaignId.toString(), "failed");
    }

    await Customer.findByIdAndUpdate(call.customerId, {
      lastCallDate: new Date(),
      lastCallStatus: mappedStatus,
      totalCalls: { $inc: 1 },
    });
  }

  async saveToolCall(callId: string, toolName: string, args: Record<string, unknown>, result?: Record<string, unknown>) {
    await connectDB();

    const update: Record<string, unknown> = {
      $push: {
        toolCalls: {
          name: toolName,
          arguments: args,
          result,
          timestamp: new Date(),
        },
      },
    };

    if (toolName === "mark_do_not_call") {
      update.doNotCall = true;
      const callDoc = await Call.findById(callId);
      if (callDoc) {
        await Customer.findByIdAndUpdate(callDoc.customerId, {
          doNotCall: true,
          doNotCallReason: args.reason as string || "Customer request",
        });
      }
    }

    if (toolName === "save_feedback" && result) {
      update.feedbackId = result.feedbackId;
      update.sentiment = result.sentiment;
      update.satisfactionScore = result.satisfactionScore;
      update.recommendationScore = result.recommendationScore;
    }

    if (toolName === "create_complaint" && result) {
      update.complaintId = result.complaintId;
    }

    if (toolName === "request_callback") {
      update.callbackRequested = true;
      const callDoc = await Call.findById(callId);
      if (callDoc) {
        await CallbackRequest.create({
          tenantId: callDoc.tenantId,
          callId: callDoc._id,
          customerId: callDoc.customerId,
          campaignId: callDoc.campaignId,
          preferredTime: args.preferredTime as string,
          reason: args.reason as string,
        });
      }
    }

    await Call.findByIdAndUpdate(callId, update);
  }

  async saveTranscript(callId: string, transcript: Array<{ role: string; content: string; timestamp: Date }>) {
    await connectDB();

    const transcriptText = transcript
      .map((t) => `${t.role === "assistant" ? "Agent" : "Customer"}: ${t.content}`)
      .join("\n");

    await Call.findByIdAndUpdate(callId, {
      transcript,
      transcriptText,
      summary: transcriptText.slice(0, 500),
    });
  }

  private async triggerAnalysis(callDoc: import("mongoose").Document & Record<string, unknown>) {
    const customer = await Customer.findById(callDoc.customerId);

    await addAnalysisJob({
      tenantId: String(callDoc.tenantId),
      callId: String(callDoc._id),
      campaignId: String(callDoc.campaignId),
      customerId: String(callDoc.customerId),
      transcript: (callDoc.transcriptText as string) || "",
      context: {
        companyName: "",
        service: customer?.service || "",
        serviceDate: customer?.serviceDate?.toString() || "",
      },
    });
  }

  async runAnalysis(jobData: {
    tenantId: string;
    callId: string;
    campaignId: string;
    customerId: string;
    transcript: string;
    context: Record<string, unknown>;
  }) {
    await connectDB();

    try {
      const openai = getOpenAIProvider();
      const analysis = await openai.analyzeCall(jobData.transcript, jobData.context);

      const feedback = await Feedback.create({
        tenantId: jobData.tenantId,
        callId: jobData.callId,
        customerId: jobData.customerId,
        campaignId: jobData.campaignId,
        sentiment: analysis.sentiment,
        satisfactionScore: analysis.satisfactionScore,
        recommendationScore: analysis.recommendationScore,
        positiveFeedback: analysis.positiveFeedback,
        negativeFeedback: analysis.negativeFeedback,
        complaintDetected: analysis.complaintDetected,
        complaintCategory: analysis.complaintCategory,
        complaintSeverity: analysis.complaintSeverity,
        problemDescription: analysis.problemDescription,
        requestedFollowUp: analysis.requestedFollowUp,
        callbackRequested: analysis.callbackRequested,
        doNotCallRequested: analysis.doNotCallRequested,
        customerIntent: analysis.customerIntent,
        summary: analysis.summary,
        keyIssues: analysis.keyIssues,
        recommendedBusinessAction: analysis.recommendedBusinessAction,
        rawTranscript: jobData.transcript,
        analyzedAt: new Date(),
      });

      await Call.findByIdAndUpdate(jobData.callId, {
        feedbackId: feedback._id,
        sentiment: analysis.sentiment,
        satisfactionScore: analysis.satisfactionScore,
        recommendationScore: analysis.recommendationScore,
        summary: analysis.summary,
      });

      if (analysis.complaintDetected) {
        const complaint = await Complaint.create({
          tenantId: jobData.tenantId,
          callId: jobData.callId,
          customerId: jobData.customerId,
          campaignId: jobData.campaignId,
          feedbackId: feedback._id,
          category: analysis.complaintCategory || "General",
          severity: analysis.complaintSeverity || "medium",
          description: analysis.problemDescription || "Complaint detected during feedback call",
          customerReported: true,
        });

        await Call.findByIdAndUpdate(jobData.callId, { complaintId: complaint._id });
      }

      if (analysis.doNotCallRequested) {
        await Customer.findByIdAndUpdate(jobData.customerId, {
          doNotCall: true,
          doNotCallReason: "Customer requested during call",
        });
        await Call.findByIdAndUpdate(jobData.callId, { doNotCall: true });
      }

      if (analysis.callbackRequested) {
        await CallbackRequest.create({
          tenantId: jobData.tenantId,
          callId: jobData.callId,
          customerId: jobData.customerId,
          campaignId: jobData.campaignId,
          reason: analysis.problemDescription || "Customer requested callback",
        });
      }

      const sentimentUpdate: Record<string, number> = {};
      if (analysis.sentiment === "positive") sentimentUpdate.positiveCount = 1;
      else if (analysis.sentiment === "neutral") sentimentUpdate.neutralCount = 1;
      else sentimentUpdate.negativeCount = 1;

      await Campaign.findByIdAndUpdate(jobData.campaignId, {
        $inc: sentimentUpdate,
      });

      await Customer.findByIdAndUpdate(jobData.customerId, {
        sentiment: analysis.sentiment,
        satisfactionScore: analysis.satisfactionScore,
        recommendationScore: analysis.recommendationScore,
      });

      await Tenant.findByIdAndUpdate(jobData.tenantId, {
        $inc: { "subscription.monthlyCallUsage": 1 },
      });

      return feedback;
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(`[Analysis] Failed for call ${jobData.callId}:`, err.message);
      throw error;
    }
  }

  private async handleCallFailed(jobData: CallJobData, errorMessage: string) {
    const campaign = await Campaign.findById(jobData.campaignId);
    if (!campaign || campaign.status !== "running") return;

    const shouldRetry =
      jobData.retryCount < jobData.maxRetries &&
      !errorMessage.includes("invalid") &&
      !errorMessage.includes("not-a-valid");

    if (shouldRetry) {
      const retryPolicy = campaign.retryPolicy as Record<string, unknown>;
      const delayMinutes = (retryPolicy.retryDelayMinutes as number) || 60;
      const delayMs = delayMinutes * 60 * 1000;

      await Call.findByIdAndUpdate(jobData.callId, {
        status: "queued",
        retryCount: jobData.retryCount + 1,
        nextRetryAt: new Date(Date.now() + delayMs),
      });

      await addRetryJob(
        { ...jobData, retryCount: jobData.retryCount + 1 },
        delayMs
      );
    }
  }

  private async updateCampaignCounts(campaignId: string, status: string) {
    const countField: Record<string, string> = {
      completed: "completedCount",
      no_answer: "noAnswerCount",
      busy: "busyCount",
      voicemail: "voicemailCount",
      failed: "failedCount",
    };

    const field = countField[status];
    if (field) {
      await Campaign.findByIdAndUpdate(campaignId, { $inc: { [field]: 1, pendingCount: -1 } });
    }

    const campaign = await Campaign.findById(campaignId);
    if (campaign && campaign.pendingCount <= 0 && campaign.status === "running") {
      await Campaign.findByIdAndUpdate(campaignId, {
        status: "completed",
        completedAt: new Date(),
      });
    }
  }

  async getById(tenantId: string, callId: string) {
    await connectDB();
    const call = await Call.findOne({ _id: callId, tenantId })
      .populate("customerId", "firstName lastName phone email")
      .populate("campaignId", "name")
      .populate("feedbackId");
    if (!call) {
      throw new Error("Call not found");
    }
    return call;
  }

  async list(tenantId: string, filters: Record<string, unknown>) {
    await connectDB();
    const validated = CallFilterSchema.parse(filters);

    const query: Record<string, unknown> = { tenantId };
    if (validated.search) {
      const safeSearch = escapeRegex(validated.search);
      const searchRegex = { $regex: safeSearch, $options: "i" };
      query.$or = [
        { fromNumber: searchRegex },
        { toNumber: searchRegex },
        { summary: searchRegex },
      ];
    }
    if (validated.status) {
      query.status = validated.status;
    }
    if (validated.campaignId) {
      query.campaignId = validated.campaignId;
    }
    if (validated.sentiment) {
      query.sentiment = validated.sentiment;
    }

    const total = await Call.countDocuments(query);
    const calls = await Call.find(query)
      .populate("customerId", "firstName lastName phone")
      .populate("campaignId", "name")
      .sort({ createdAt: -1 })
      .skip((validated.page - 1) * validated.limit)
      .limit(validated.limit);

    return {
      calls,
      total,
      page: validated.page,
      limit: validated.limit,
      totalPages: Math.ceil(total / validated.limit),
    };
  }

  async getStats(tenantId: string, campaignId?: string) {
    await connectDB();
    const matchQuery: Record<string, unknown> = { tenantId };
    if (campaignId) {
      matchQuery.campaignId = campaignId;
    }

    const [total, byStatus, bySentiment, avgDuration, avgSatisfaction] = await Promise.all([
      Call.countDocuments(matchQuery),
      Call.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Call.aggregate([
        { $match: { ...matchQuery, sentiment: { $exists: true } } },
        { $group: { _id: "$sentiment", count: { $sum: 1 } } },
      ]),
      Call.aggregate([
        { $match: { ...matchQuery, duration: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: "$duration" } } },
      ]),
      Call.aggregate([
        { $match: { ...matchQuery, satisfactionScore: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: "$satisfactionScore" } } },
      ]),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      bySentiment: bySentiment.reduce((acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      averageDuration: avgDuration[0]?.avg || 0,
      averageSatisfaction: avgSatisfaction[0]?.avg || 0,
    };
  }
}

export const callService = new CallService();

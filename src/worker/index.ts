import "./load-env";
import { Worker, Job } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { connectDB } from "../lib/db";
import { Call, Campaign, Customer, Feedback, Complaint, CallbackRequest, Tenant } from "../lib/models";
import { getVapiProvider, getOpenAIProvider } from "../lib/providers";
import { addRetryJob, addAnalysisJob, CallJobData } from "../lib/queue";

async function initiateCallProcessor(job: Job) {
  const data: CallJobData = job.data;
  console.log(`[Worker] Processing call ${data.callId} for customer ${data.customerId}`);

  await connectDB();

  const call = await Call.findById(data.callId);
  if (!call) {
    console.error(`[Worker] Call ${data.callId} not found`);
    return;
  }

  if (call.status !== "queued" && call.status !== "pending") {
    console.log(`[Worker] Call ${data.callId} already in status ${call.status}, skipping`);
    return;
  }

  const campaign = await Campaign.findById(data.campaignId);
  if (!campaign || campaign.status !== "running") {
    await Call.findByIdAndUpdate(data.callId, { status: "cancelled" });
    console.log(`[Worker] Campaign ${data.campaignId} not running, cancelling call`);
    return;
  }

  const customer = await Customer.findById(data.customerId);
  if (!customer || customer.doNotCall) {
    await Call.findByIdAndUpdate(data.callId, { status: "do_not_call", doNotCall: true });
    console.log(`[Worker] Customer ${data.customerId} is DNC, skipping`);
    return;
  }

  try {
    await Call.findByIdAndUpdate(data.callId, {
      status: "initiating",
      startedAt: new Date(),
    });

    const webhookBase = process.env.NEXT_PUBLIC_APP_URL!;
    const statusCallbackUrl = `${webhookBase}/api/webhooks/vapi`;
    const voiceUrl = `${webhookBase}/api/vapi/voice`;

    console.log(`[Worker] Call ${data.callId} webhook URL: ${voiceUrl}`);
    console.log(`[Worker] Call ${data.callId} status callback URL: ${statusCallbackUrl}`);
    console.log(`[Worker] Call ${data.callId} calling ${data.to} from ${data.from}`);

    const provider = getVapiProvider();
    const result = await provider.initiateCall({
      tenantId: data.tenantId,
      callId: data.callId,
      from: data.from,
      to: data.to,
      webhookUrl: voiceUrl,
      statusCallbackUrl,
    });

    console.log(`[Worker] Call ${data.callId} Vapi response:`, JSON.stringify(result));

    await Call.findByIdAndUpdate(data.callId, {
      providerCallSid: result.providerCallSid,
      status: "ringing",
      provider: "vapi",
    });

    console.log(`[Worker] Call ${data.callId} initiated successfully, SID: ${result.providerCallSid}`);
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    console.error(`[Worker] Call ${data.callId} failed:`, err.message);
    console.error(`[Worker] Call ${data.callId} stack:`, err.stack);

    await Call.findByIdAndUpdate(data.callId, {
      status: "failed",
      error: err.message,
    });

    if (data.retryCount < data.maxRetries) {
      const retryDelay = 60 * 60 * 1000;
      await addRetryJob(
        { ...data, retryCount: data.retryCount + 1 },
        retryDelay
      );
      await Call.findByIdAndUpdate(data.callId, {
        status: "queued",
        retryCount: data.retryCount + 1,
      });
    }
  }
}

async function retryCallProcessor(job: Job) {
  const data: CallJobData = job.data;
  console.log(`[Worker] Retrying call ${data.callId} (attempt ${data.retryCount + 1})`);
  await initiateCallProcessor(job);
}

async function analysisProcessor(job: Job) {
  const data = job.data;
  console.log(`[Worker] Running analysis for call ${data.callId}`);

  await connectDB();

  try {
    const openai = getOpenAIProvider();
    const analysis = await openai.analyzeCall(data.transcript, data.context);

    const feedback = await Feedback.create({
      tenantId: data.tenantId,
      callId: data.callId,
      customerId: data.customerId,
      campaignId: data.campaignId,
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
      rawTranscript: data.transcript,
      analyzedAt: new Date(),
    });

    await Call.findByIdAndUpdate(data.callId, {
      feedbackId: feedback._id,
      sentiment: analysis.sentiment,
      satisfactionScore: analysis.satisfactionScore,
      recommendationScore: analysis.recommendationScore,
      summary: analysis.summary,
    });

    if (analysis.complaintDetected) {
      await Complaint.create({
        tenantId: data.tenantId,
        callId: data.callId,
        customerId: data.customerId,
        campaignId: data.campaignId,
        feedbackId: feedback._id,
        category: analysis.complaintCategory || "General",
        severity: analysis.complaintSeverity || "medium",
        description: analysis.problemDescription || "Complaint detected",
        customerReported: true,
      });
    }

    if (analysis.doNotCallRequested) {
      await Customer.findByIdAndUpdate(data.customerId, {
        doNotCall: true,
        doNotCallReason: "Customer requested during call",
      });
    }

    const sentimentUpdate: Record<string, number> = {};
    if (analysis.sentiment === "positive") sentimentUpdate.positiveCount = 1;
    else if (analysis.sentiment === "neutral") sentimentUpdate.neutralCount = 1;
    else sentimentUpdate.negativeCount = 1;

    await Campaign.findByIdAndUpdate(data.campaignId, { $inc: sentimentUpdate });

    await Customer.findByIdAndUpdate(data.customerId, {
      sentiment: analysis.sentiment,
      satisfactionScore: analysis.satisfactionScore,
      recommendationScore: analysis.recommendationScore,
    });

    console.log(`[Worker] Analysis complete for call ${data.callId}: ${analysis.sentiment}`);
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error(`[Worker] Analysis failed for call ${data.callId}:`, err.message);
  }
}

async function startWorker() {
  console.log("[Worker] Starting call worker...");
  console.log("[Worker] NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
  console.log("[Worker] MONGODB_URI set:", !!process.env.MONGODB_URI);
  const redisUrl = process.env.REDIS_URL || "";
  const redisHost = redisUrl.includes("@") ? redisUrl.split("@")[1] : "unknown";
  console.log("[Worker] REDIS_URL host:", redisHost);
  console.log("[Worker] VAPI_API_KEY set:", !!process.env.VAPI_API_KEY);

  await connectDB();

  const redisConn = createRedisConnection();
  try {
    await redisConn.ping();
    console.log("[Worker] Redis ping successful");
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error("[Worker] Redis connection failed:", e.message);
    process.exit(1);
  }

  const callWorker = new Worker("calls", initiateCallProcessor, {
    connection: createRedisConnection(),
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5"),
    limiter: {
      max: 50,
      duration: 60000,
    },
  });

  const retryWorker = new Worker("retry", retryCallProcessor, {
    connection: createRedisConnection(),
    concurrency: 5,
  });

  const analysisWorker = new Worker("analysis", analysisProcessor, {
    connection: createRedisConnection(),
    concurrency: 3,
  });

  callWorker.on("completed", (job) => {
    console.log(`[Worker] Call job ${job.id} completed`);
  });

  callWorker.on("failed", (job, err) => {
    console.error(`[Worker] Call job ${job?.id} failed:`, err.message);
  });

  retryWorker.on("completed", (job) => {
    console.log(`[Worker] Retry job ${job.id} completed`);
  });

  analysisWorker.on("completed", (job) => {
    console.log(`[Worker] Analysis job ${job.id} completed`);
  });

  console.log("[Worker] All workers started successfully");
}

startWorker().catch(console.error);

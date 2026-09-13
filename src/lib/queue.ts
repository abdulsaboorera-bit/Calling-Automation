import { Queue, Job, JobsOptions } from "bullmq";
import { createRedisConnection } from "./redis";

export const QUEUE_NAMES = {
  CALLS: "calls",
  RETRY: "retry",
  ANALYSIS: "analysis",
  IMPORT: "import",
  WEBHOOK: "webhook",
} as const;

const QUEUE_CONFIG = {
  defaultJobOptions: {
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: { count: 50, age: 604800 },
    attempts: 3,
    backoff: {
      type: "exponential" as const,
      delay: 5000,
    },
  },
};

const queueCache = new Map<string, Queue>();

export function createQueue(name: string): Queue {
  const existing = queueCache.get(name);
  if (existing) {
    return existing;
  }
  const queue = new Queue(name, {
    connection: createRedisConnection(),
    defaultJobOptions: QUEUE_CONFIG.defaultJobOptions,
  });
  queueCache.set(name, queue);
  return queue;
}

export interface CallJobData {
  tenantId: string;
  campaignId: string;
  callId: string;
  customerId: string;
  phoneNumberId: string;
  agentConfigurationId: string;
  from: string;
  to: string;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, unknown>;
  agentConfig?: {
    name: string;
    companyName: string;
    businessDescription: string;
    agentName: string;
    voice: string;
    language: string;
    tone: string;
    openingMessage: string;
    feedbackQuestions: string[];
    closingMessage: string;
    maxCallDurationSeconds: number;
    systemPrompt: string;
  };
  phoneNumber?: {
    phoneNumber: string;
    friendlyName: string;
  };
}

export interface AnalysisJobData {
  tenantId: string;
  callId: string;
  campaignId: string;
  customerId: string;
  transcript: string;
  context: Record<string, unknown>;
}

export interface ImportJobData {
  tenantId: string;
  importBatchId: string;
  records: Record<string, unknown>[];
  fieldMapping: Record<string, string>;
}

export async function addCallJob(data: CallJobData, delay?: number): Promise<Job> {
  console.log(`[Queue] Adding call job for customer ${data.customerId}, call ${data.callId}, to: ${data.to}`);
  const queue = createQueue(QUEUE_NAMES.CALLS);
  const options: JobsOptions = {};
  if (delay) {
    options.delay = delay;
  }
  const job = await queue.add("initiate-call", data, options);
  console.log(`[Queue] Call job added: ${job.id}`);
  return job;
}

export async function addAnalysisJob(data: AnalysisJobData): Promise<Job> {
  console.log(`[Queue] Adding analysis job for call ${data.callId}`);
  const queue = createQueue(QUEUE_NAMES.ANALYSIS);
  const job = await queue.add("analyze-call", data);
  console.log(`[Queue] Analysis job added: ${job.id}`);
  return job;
}

export async function addRetryJob(data: CallJobData, delayMs: number): Promise<Job> {
  console.log(`[Queue] Adding retry job for call ${data.callId}, delay: ${delayMs}ms`);
  const queue = createQueue(QUEUE_NAMES.RETRY);
  const job = await queue.add("retry-call", data, { delay: delayMs });
  console.log(`[Queue] Retry job added: ${job.id}`);
  return job;
}

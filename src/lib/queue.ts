import { Queue, Worker, Job, JobsOptions } from "bullmq";
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

export function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: createRedisConnection(),
    defaultJobOptions: QUEUE_CONFIG.defaultJobOptions,
  });
}

export function createWorker(
  name: string,
  processor: (job: Job) => Promise<void>,
  concurrency: number = 5
): Worker {
  const worker = new Worker(name, processor, {
    connection: createRedisConnection(),
    concurrency,
    limiter: {
      max: 50,
      duration: 1000,
    },
  });

  worker.on("completed", (job) => {
    console.log(`[Worker:${name}] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker:${name}] Job ${job?.id} failed:`, err.message);
  });

  return worker;
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
  const queue = createQueue(QUEUE_NAMES.CALLS);
  const options: JobsOptions = {};
  if (delay) {
    options.delay = delay;
  }
  return queue.add("initiate-call", data, options);
}

export async function addAnalysisJob(data: AnalysisJobData): Promise<Job> {
  const queue = createQueue(QUEUE_NAMES.ANALYSIS);
  return queue.add("analyze-call", data);
}

export async function addRetryJob(data: CallJobData, delayMs: number): Promise<Job> {
  const queue = createQueue(QUEUE_NAMES.RETRY);
  return queue.add("retry-call", data, { delay: delayMs });
}

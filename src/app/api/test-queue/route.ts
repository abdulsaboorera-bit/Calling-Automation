import { NextResponse } from "next/server";
import { createRedisConnection } from "@/lib/redis";
import { connectDB } from "@/lib/db";
import { addCallJob } from "@/lib/queue";

export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    await connectDB();
    results.mongodb = "connected";
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: "MongoDB failed", details: e.message }, { status: 500 });
  }

  try {
    const redis = createRedisConnection();
    await redis.ping();
    results.redis = "connected";
    redis.disconnect();
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: "Redis failed", details: e.message }, { status: 500 });
  }

  try {
    const testJob = await addCallJob({
      tenantId: "test",
      campaignId: "test",
      callId: "test",
      customerId: "test",
      phoneNumberId: "test",
      agentConfigurationId: "test",
      from: "+1234567890",
      to: "+1234567890",
      retryCount: 0,
      maxRetries: 0,
    });
    results.queue = { status: "job added", jobId: testJob.id };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: "Queue failed", details: e.message }, { status: 500 });
  }

  return NextResponse.json(results, { status: 200 });
}

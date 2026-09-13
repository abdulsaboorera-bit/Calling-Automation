import { NextResponse } from "next/server";
import { createRedisConnection } from "@/lib/redis";
import { connectDB } from "@/lib/db";

export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    const redis = createRedisConnection();
    const pong = await redis.ping();
    const keys = await redis.keys("bull:*");
    results.redis = { status: "connected", pong, queueKeys: keys.slice(0, 20) };
    redis.disconnect();
  } catch (err: unknown) {
    const e = err as { message?: string };
    results.redis = { status: "failed", error: e.message };
  }

  try {
    await connectDB();
    results.mongodb = { status: "connected" };
  } catch (err: unknown) {
    const e = err as { message?: string };
    results.mongodb = { status: "failed", error: e.message };
  }

  const redisUrl = process.env.REDIS_URL || "";
  const redisHost = redisUrl.includes("@") ? redisUrl.split("@")[1] : "unknown";

  results.env = {
    REDIS_URL_host: redisHost,
    REDIS_URL_set: !!process.env.REDIS_URL,
    MONGODB_URI_set: !!process.env.MONGODB_URI,
    VAPI_API_KEY_set: !!process.env.VAPI_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  return NextResponse.json(results, { status: 200 });
}

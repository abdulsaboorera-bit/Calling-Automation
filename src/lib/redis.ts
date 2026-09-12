import Redis from "ioredis";

let redisConnection: Redis | null = null;

export function createRedisConnection(): Redis {
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  console.log(`[Redis] Creating connection (URL starts with: ${REDIS_URL.substring(0, 12)}...)`);

  const isTls = REDIS_URL.startsWith("rediss://");
  const conn = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      console.log(`[Redis] Retry attempt ${times}, delay ${delay}ms`);
      return delay;
    },
    connectTimeout: 10000,
  });

  conn.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  conn.on("connect", () => {
    console.log("[Redis] TCP connected");
  });

  conn.on("ready", () => {
    console.log("[Redis] Ready");
  });

  conn.on("close", () => {
    console.log("[Redis] Connection closed");
  });

  return conn;
}

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = createRedisConnection();
  }
  return redisConnection;
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    const conn = createRedisConnection();
    await conn.ping();
    console.log("[Redis] Ping successful");
    conn.disconnect();
    return true;
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error("[Redis] Connection test failed:", e.message);
    return false;
  }
}

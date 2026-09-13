import Redis from "ioredis";

let cachedConnection: Redis | null = null;

export function createRedisConnection(): Redis {
  if (cachedConnection) {
    return cachedConnection;
  }

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
      return delay;
    },
    connectTimeout: 10000,
  });

  conn.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  conn.on("close", () => {
    console.log("[Redis] Connection closed, clearing cache");
    cachedConnection = null;
  });

  cachedConnection = conn;
  return conn;
}

export function getRedisConnection(): Redis {
  return createRedisConnection();
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    const conn = createRedisConnection();
    await conn.ping();
    return true;
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error("[Redis] Connection test failed:", e.message);
    return false;
  }
}

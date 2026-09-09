import Redis from "ioredis";

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    const REDIS_URL = process.env.REDIS_URL;
    if (!REDIS_URL) {
      throw new Error("REDIS_URL environment variable is not set");
    }
    redisConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisConnection.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    redisConnection.on("connect", () => {
      console.log("[Redis] Connected");
    });
  }

  return redisConnection;
}

export function createRedisConnection(): Redis {
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    throw new Error("REDIS_URL environment variable is not set");
  }
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

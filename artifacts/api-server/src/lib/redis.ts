import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  connectTimeout: 3000,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 100, 1000);
  },
});

export const bullRedis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("error", (err) => {
  console.error("[Redis/cache] Connection error:", (err as Error).message);
});

bullRedis.on("error", (err) => {
  console.error("[Redis/bullmq] Connection error:", (err as Error).message);
});

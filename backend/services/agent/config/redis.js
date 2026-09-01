import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient = null;

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 2) return null; // stop retrying quickly
      return Math.min(times * 100, 500);
    },
  });

  redisClient.connect().catch((err) => {
    console.warn("[Agent Redis] Initial connection failed (offline mode active):", err.message);
  });

  redisClient.on("connect", () => {
    console.log("[Agent Redis] Connected successfully");
  });

  redisClient.on("error", (error) => {
    // suppress repetitive offline noise
  });
} catch (err) {
  console.warn("[Agent Redis] Initialization error:", err.message);
}

export default redisClient;

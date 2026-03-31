import { redis } from "./redis.js";

const DEFAULT_TTL_SECONDS = 10;

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function invalidateWallet(address: string): Promise<void> {
  const pattern = `wallet:${address}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export async function invalidateWalletsList(): Promise<void> {
  await redis.del("wallets:list");
}

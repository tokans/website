import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRedis } from "./redis.js";

interface RateLimitOptions {
  bucket: string;          // e.g. "signin"
  windowSec: number;       // window in seconds
  max: number;             // max requests per window per key
  key?: string;            // override key (defaults to client IP)
}

function clientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    const first = xff.split(",")[0];
    if (first) return first.trim();
  }
  if (Array.isArray(xff) && xff[0]) return xff[0];
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.length > 0) return real;
  return req.socket?.remoteAddress ?? "unknown";
}

/**
 * Fixed-window rate limit using Redis INCR + EXPIRE.
 * Returns true if allowed; sends 429 and returns false if exceeded.
 */
export async function checkRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  opts: RateLimitOptions
): Promise<boolean> {
  const kv = getRedis();
  const id = opts.key ?? clientIp(req);
  const window = Math.floor(Date.now() / 1000 / opts.windowSec);
  const redisKey = `rl:${opts.bucket}:${id}:${window}`;

  const count = await kv.incr(redisKey);
  if (count === 1) {
    await kv.expire(redisKey, opts.windowSec);
  }

  const remaining = Math.max(0, opts.max - count);
  res.setHeader("X-RateLimit-Limit", String(opts.max));
  res.setHeader("X-RateLimit-Remaining", String(remaining));

  if (count > opts.max) {
    const retryAfter = opts.windowSec - (Math.floor(Date.now() / 1000) % opts.windowSec);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return false;
  }
  return true;
}

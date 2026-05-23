import { Redis } from "@upstash/redis";
import "./env.js";

let _kv: Redis | null = null;

function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.length > 0) return v;
  }
  return undefined;
}

export function getRedis(): Redis {
  if (_kv) return _kv;

  const url = pickEnv(
    "UPSTASH_REDIS_REST_URL",
    "KV_REST_API_URL",
    "T_KV_REST_API_URL"
  );
  const token = pickEnv(
    "UPSTASH_REDIS_REST_TOKEN",
    "KV_REST_API_TOKEN",
    "T_KV_REST_API_TOKEN"
  );

  if (!url || !token) {
    throw new Error(
      "Upstash Redis env vars missing (need UPSTASH_REDIS_REST_URL/TOKEN, KV_REST_API_URL/TOKEN, or T_KV_REST_API_URL/TOKEN)"
    );
  }

  _kv = new Redis({ url, token });
  return _kv;
}

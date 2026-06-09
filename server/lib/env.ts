/**
 * Loads .env.local for local dev when `vercel dev` doesn't propagate
 * environment variables into the function runtime.
 *
 * No-op in production (Vercel sets env vars natively there).
 * Safe to import multiple times — dotenv caches and never overrides
 * variables that are already set.
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

let _loaded = false;

export function loadEnv(): void {
  if (_loaded) return;
  _loaded = true;

  // Vercel production injects env natively — skip.
  if (process.env["VERCEL"] === "1" && process.env["VERCEL_ENV"] !== "development") {
    return;
  }

  const candidates = [
    ".env.development.local",
    ".env.local",
    ".env.development",
    ".env",
  ];

  for (const file of candidates) {
    const path = resolve(process.cwd(), file);
    if (existsSync(path)) {
      // `override: false` — never clobber vars already set in the environment.
      config({ path, override: false });
    }
  }
}

// Auto-load on import so any module that pulls this in is covered.
loadEnv();

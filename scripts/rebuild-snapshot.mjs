#!/usr/bin/env node
/**
 * Rebuild the public directory JSON snapshots (apps, partners) on demand.
 *
 * This is the same job the daily Vercel cron runs (api/cron/snapshot.ts) — it
 * triggers that endpoint over HTTP so the snapshot logic lives in exactly one
 * place. Useful after seeding data locally, or to refresh prod between cron runs.
 *
 * Usage:
 *   npm run snapshot:rebuild                         # → http://localhost:3000 (vercel dev)
 *   SNAPSHOT_URL=https://tokans.org npm run snapshot:rebuild
 *   (sends Authorization: Bearer $CRON_SECRET when set)
 */
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

for (const f of [".env.development.local", ".env.local", ".env.development", ".env"]) {
  const p = join(root, f);
  if (existsSync(p)) config({ path: p, override: false });
}

const base = (process.env.SNAPSHOT_URL ?? "http://localhost:3000").replace(/\/$/, "");
const url = `${base}/api/cron/snapshot`;
const secret = process.env.CRON_SECRET;

const headers = secret ? { Authorization: `Bearer ${secret}` } : {};

console.log(`Rebuilding snapshots via ${url} …`);
try {
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Failed (${res.status}): ${text}`);
    process.exit(1);
  }
  console.log("Done:", text);
} catch (e) {
  console.error("Could not reach the endpoint. Is the dev server running (npm run local)?");
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

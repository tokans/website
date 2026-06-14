/**
 * Daily JSON snapshots for the public, pre-login directories (apps, partners).
 *
 * These pages are read-heavy and anonymous, so hitting Postgres on every view
 * is wasteful. A daily cron (server/cron/snapshot.ts) rebuilds the snapshots and
 * stores them as JSON in Redis; the public GET endpoints serve from the snapshot
 * and only fall back to the DB on a cold cache. This keeps steady-state read
 * load off the database.
 */
import { getDb } from "./db.js";
import { getRedis } from "./redis.js";
import { type AppRow, mapAppRow } from "./apps.js";
import { type PartnerRow, mapPartnerRow } from "./partners.js";
import type { AppListing, PartnerListing } from "./backend/contract.js";

const KEY_APPS = "snapshot:apps:v1";
const KEY_PARTNERS = "snapshot:partners:v1";

export interface AppsSnapshot { apps: AppListing[]; generatedAt: string }
export interface PartnersSnapshot { partners: PartnerListing[]; generatedAt: string }

// ── Build (queries the DB — only run by the cron, not per request) ─────────────
export async function buildAppsSnapshot(): Promise<AppsSnapshot> {
  const sql = getDb();
  const rows = (await sql`
    SELECT id, slug, name, tagline, repo_url, stack, description,
           icon_url, site_url, uses_sharedcorelib, support_status, listed, owner_user_id
    FROM apps WHERE listed = TRUE ORDER BY name
  `) as AppRow[];
  // Snapshot is the public view — isOwner is per-viewer and never cached.
  return { apps: rows.map((r) => mapAppRow(r, null)), generatedAt: new Date().toISOString() };
}

export async function buildPartnersSnapshot(): Promise<PartnersSnapshot> {
  const sql = getDb();
  const rows = (await sql`
    SELECT pl.id, pl.professional_user_id, u.name, pl.headline, pl.profession,
           pl.skills, pl.role_category
    FROM partner_listings pl
    JOIN users u ON u.id = pl.professional_user_id
    WHERE pl.visible = TRUE
    ORDER BY pl.created_at DESC
    LIMIT 200
  `) as PartnerRow[];
  return { partners: rows.map(mapPartnerRow), generatedAt: new Date().toISOString() };
}

/** Rebuild both snapshots and persist them to Redis. Returns row counts. */
export async function rebuildSnapshots(): Promise<{ apps: number; partners: number; generatedAt: string }> {
  const [apps, partners] = await Promise.all([buildAppsSnapshot(), buildPartnersSnapshot()]);
  const redis = getRedis();
  await Promise.all([redis.set(KEY_APPS, apps), redis.set(KEY_PARTNERS, partners)]);
  return { apps: apps.apps.length, partners: partners.partners.length, generatedAt: apps.generatedAt };
}

// ── Read (no DB) ──────────────────────────────────────────────────────────────
export async function readAppsSnapshot(): Promise<AppsSnapshot | null> {
  try { return await getRedis().get<AppsSnapshot>(KEY_APPS); } catch { return null; }
}

export async function readPartnersSnapshot(): Promise<PartnersSnapshot | null> {
  try { return await getRedis().get<PartnersSnapshot>(KEY_PARTNERS); } catch { return null; }
}

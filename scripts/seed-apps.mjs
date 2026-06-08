#!/usr/bin/env node
/**
 * Seed the apps support directory from the local workspace (dev-only).
 *
 * The seed vibe-coded apps are the projects in C:\workspace\ whose folder name
 * starts with "my" (myFinance, myHealth, myWorkAssistant, …). For each, upsert a
 * `listed` row into the `apps` table. Idempotent.
 *
 * Usage:  npm run seed:apps        (needs DATABASE_URL + filesystem access)
 * Override the scan root with WORKSPACE_ROOT=/path npm run seed:apps
 */
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { neon, neonConfig } from "@neondatabase/serverless";
import { readAppPurpose } from "./lib/appReadme.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(here, "..");

// Load env the same way the API does (never clobber already-set vars).
for (const f of [".env.development.local", ".env.local", ".env.development", ".env"]) {
  const p = join(websiteRoot, f);
  if (existsSync(p)) config({ path: p, override: false });
}

// website is C:\workspace\tokans\website → workspace root is three levels up.
const workspaceRoot = process.env.WORKSPACE_ROOT ?? resolve(here, "../../..");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set — cannot seed.");
  process.exit(1);
}

// Mirror api/lib/db.ts: when LOCAL_DB=1 the DATABASE_URL points at the local
// neon-proxy container (localhost:4444). Reroute the serverless driver at it
// over plain HTTP, otherwise it defaults to https://<host>/sql (port 443) and
// fails with ECONNREFUSED. Requires the docker stack: npm run local:up
if (process.env.LOCAL_DB === "1") {
  neonConfig.fetchEndpoint = (host, port) => `http://${host}:${port}/sql`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

const sql = neon(url);

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const dirs = readdirSync(workspaceRoot, { withFileTypes: true }).filter(
  (d) => d.isDirectory() && d.name.toLowerCase().startsWith("my")
);

if (dirs.length === 0) {
  console.log(`No my* directories found in ${workspaceRoot}.`);
  process.exit(0);
}

let seeded = 0;
for (const d of dirs) {
  const slug = slugify(d.name);
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
    console.warn(`skip ${d.name}: cannot derive a valid slug`);
    continue;
  }
  const appDir = join(workspaceRoot, d.name);

  // Purpose comes from the app's README (see scripts/lib/appReadme.mjs). The
  // package.json `description` is only a fallback for the short tagline.
  const { tagline: readmeTagline, description } = readAppPurpose(appDir);
  let tagline = readmeTagline;
  if (!tagline) {
    const pkgPath = join(appDir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (typeof pkg.description === "string" && pkg.description.trim()) {
          tagline = pkg.description.trim();
        }
      } catch {
        /* ignore unreadable/invalid package.json */
      }
    }
  }
  if (!tagline && !description) {
    console.warn(`note ${d.name}: no README purpose found (run validate-app-readme)`);
  }

  await sql`
    INSERT INTO apps (slug, name, tagline, description, uses_sharedcorelib, support_status, listed)
    VALUES (${slug}, ${d.name}, ${tagline}, ${description}, TRUE, 'listed', TRUE)
    ON CONFLICT (slug) DO UPDATE SET
      tagline     = COALESCE(EXCLUDED.tagline, apps.tagline),
      description = COALESCE(EXCLUDED.description, apps.description),
      listed      = TRUE,
      updated_at  = NOW()
  `;
  seeded++;
  console.log(`seeded ${d.name} → ${slug}${tagline ? ` — ${tagline}` : ""}`);
}

console.log(`Done: ${seeded} app(s) from ${workspaceRoot}`);

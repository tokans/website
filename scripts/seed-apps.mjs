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
import { readdirSync, existsSync, readFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, join, dirname, extname } from "node:path";
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

// Where seeded icons are copied to. Served by the static site at /app-icons/<slug>.
const ICON_OUT_DIR = join(websiteRoot, "public", "app-icons");

// Candidate icon files inside an app, most-preferred first: a real square app
// icon beats a favicon. Tauri apps keep theirs in src-tauri/icons/.
const ICON_CANDIDATES = [
  "src-tauri/icons/icon.png",
  "src-tauri/app-icon.png",
  "src-tauri/icons/128x128@2x.png",
  "src-tauri/icons/128x128.png",
  "public/logo.png",
  "public/logo.svg",
  "public/icon.png",
  "public/icon.svg",
  "public/favicon.svg",
  "public/favicon.png",
  "assets/logo.png",
];

/**
 * Find an app's icon, copy it into public/app-icons/<slug><ext>, and return the
 * site-relative URL (or null if the app has no usable icon — e.g. a toolkit pkg).
 */
function seedIcon(appDir, slug) {
  const rel = ICON_CANDIDATES.find((c) => existsSync(join(appDir, c)));
  if (!rel) return null;
  const src = join(appDir, rel);
  const ext = (extname(src) || ".png").toLowerCase();
  mkdirSync(ICON_OUT_DIR, { recursive: true });
  copyFileSync(src, join(ICON_OUT_DIR, `${slug}${ext}`));
  return `/app-icons/${slug}${ext}`;
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

  const iconUrl = seedIcon(appDir, slug);

  await sql`
    INSERT INTO apps (slug, name, tagline, description, icon_url, uses_sharedcorelib, support_status, listed)
    VALUES (${slug}, ${d.name}, ${tagline}, ${description}, ${iconUrl}, TRUE, 'listed', TRUE)
    ON CONFLICT (slug) DO UPDATE SET
      tagline     = COALESCE(EXCLUDED.tagline, apps.tagline),
      description = COALESCE(EXCLUDED.description, apps.description),
      icon_url    = COALESCE(EXCLUDED.icon_url, apps.icon_url),
      listed      = TRUE,
      updated_at  = NOW()
  `;
  seeded++;
  console.log(`seeded ${d.name} → ${slug}${iconUrl ? " [icon]" : ""}${tagline ? ` — ${tagline}` : ""}`);
}

console.log(`Done: ${seeded} app(s) from ${workspaceRoot}`);

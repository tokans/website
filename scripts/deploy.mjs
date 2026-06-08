#!/usr/bin/env node
/**
 * One-command production deploy orchestrator.
 *
 * Automates the whole pipeline so a deploy is a single command:
 *   1. Provision Neon Postgres   (if NEON_API_KEY set and DATABASE_URL missing)
 *   2. Provision Upstash Redis   (if UPSTASH_EMAIL+UPSTASH_API_KEY set and REST url missing)
 *   3. Generate CRON_SECRET       (if missing)
 *   4. Push all resolved env vars to the Vercel project (production)
 *   5. Apply the DB schema        (idempotent — scripts/apply-schema.mjs)
 *   6. vercel deploy --prod       (build + deploy)
 *   7. Rebuild the JSON snapshots  (hits /api/cron/snapshot on the live site)
 *
 * Anything already provided (e.g. you set DATABASE_URL yourself) is reused and
 * its provisioning step is skipped — every step is idempotent and safe to re-run.
 *
 * Config is read from .env.deploy.local (gitignored). See .env.deploy.example.
 *
 * Usage:
 *   npm run deploy            # do it
 *   npm run deploy -- --dry-run   # print the plan, create/change nothing
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const DRY = process.argv.includes("--dry-run");

// Deploy config first (provider tokens), then the app's own env files.
for (const f of [".env.deploy.local", ".env.deploy", ".env.local", ".env"]) {
  const p = join(root, f);
  if (existsSync(p)) config({ path: p, override: false });
}

const env = process.env;
const step = (n, t) => console.log(`\n\x1b[1m[${n}] ${t}\x1b[0m`);
const info = (m) => console.log(`    ${m}`);
const warn = (m) => console.log(`    \x1b[33m! ${m}\x1b[0m`);
const die  = (m) => { console.error(`\n\x1b[31m✖ ${m}\x1b[0m`); process.exit(1); };

function sh(cmd, args, { input, capture = false, allowFail = false } = {}) {
  if (DRY) { info(`(dry-run) ${cmd} ${args.join(" ")}`); return { status: 0, stdout: "" }; }
  const r = spawnSync(cmd, args, {
    input, encoding: "utf8",
    stdio: capture ? ["pipe", "pipe", "pipe"] : ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  if (r.error) { if (allowFail) return r; die(`${cmd} failed: ${r.error.message}`); }
  if (r.status !== 0 && !allowFail) {
    if (capture && r.stderr) console.error(r.stderr);
    die(`${cmd} ${args[0]} exited ${r.status}`);
  }
  return r;
}

async function api(url, { method = "GET", headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) die(`${method} ${url} → ${res.status}: ${text.slice(0, 400)}`);
  return json;
}

// ── Resolved config we'll push to Vercel ──────────────────────────────────────
const resolved = {};
function take(name, value) { if (value != null && value !== "") resolved[name] = String(value); }

// Carry through anything already set (lets you pre-set OAuth/Stripe/etc).
for (const k of [
  "DATABASE_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
  "CRON_SECRET", "APP_URL", "PUBLIC_BASE_URL",
  "PAYMENTS_MODE", "BACKEND_MODE",
  "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "BACKEND_REST_URL", "BACKEND_IDENTITY_SECRET", "MWA_DOWNLOAD_BASE",
]) take(k, env[k]);

console.log(`\n\x1b[1m═══ Tokans production deploy ${DRY ? "(DRY RUN)" : ""} ═══\x1b[0m`);

// ── 1. Neon Postgres ──────────────────────────────────────────────────────────
async function provisionNeon() {
  step(1, "Neon Postgres");
  if (resolved.DATABASE_URL) { info("DATABASE_URL already set — skipping provisioning."); return; }
  const key = env.NEON_API_KEY;
  const name = env.NEON_PROJECT_NAME ?? "tokans-prod";
  if (DRY) {
    if (key) info(`(dry-run) would find/create Neon project "${name}" and read its connection string`);
    else warn("(dry-run) need DATABASE_URL or NEON_API_KEY to provision Postgres");
    resolved.DATABASE_URL = "postgres://DRY";
    return;
  }
  if (!key) die("DATABASE_URL is required — set DATABASE_URL or NEON_API_KEY in .env.deploy.local.");
  const H = { Authorization: `Bearer ${key}` };

  const list = await api("https://console.neon.tech/api/v2/projects", { headers: H });
  let proj = (list.projects ?? []).find((p) => p.name === name);
  if (!proj) {
    info(`Creating Neon project "${name}"…`);
    const created = await api("https://console.neon.tech/api/v2/projects", {
      method: "POST", headers: H, body: { project: { name } },
    });
    proj = created.project;
    const uri = (created.connection_uris ?? [])[0]?.connection_uri;
    if (!uri) die("Neon created but returned no connection_uri.");
    resolved.DATABASE_URL = uri;
    info(`Created project ${proj.id}.`);
  } else {
    info(`Found Neon project ${proj.id} — fetching connection string…`);
    const dbs = await api(`https://console.neon.tech/api/v2/projects/${proj.id}/branches/${proj.default_branch_id ?? ""}/databases`, { headers: H }).catch(() => ({ databases: [] }));
    const dbName = (dbs.databases ?? [])[0]?.name ?? "neondb";
    const roles = await api(`https://console.neon.tech/api/v2/projects/${proj.id}/branches/${proj.default_branch_id ?? ""}/roles`, { headers: H }).catch(() => ({ roles: [] }));
    const roleName = (roles.roles ?? [])[0]?.name ?? `${dbName}_owner`;
    const conn = await api(`https://console.neon.tech/api/v2/projects/${proj.id}/connection_uri?database_name=${encodeURIComponent(dbName)}&role_name=${encodeURIComponent(roleName)}&pooled=true`, { headers: H });
    if (!conn.uri) die("Could not read Neon connection_uri for the existing project; set DATABASE_URL manually.");
    resolved.DATABASE_URL = conn.uri;
  }
  info("DATABASE_URL resolved.");
}

// ── 2. Upstash Redis ──────────────────────────────────────────────────────────
async function provisionUpstash() {
  step(2, "Upstash Redis");
  if (resolved.UPSTASH_REDIS_REST_URL && resolved.UPSTASH_REDIS_REST_TOKEN) { info("Upstash REST creds already set — skipping."); return; }
  const email = env.UPSTASH_EMAIL, key = env.UPSTASH_API_KEY;
  const name = env.UPSTASH_DB_NAME ?? "tokans-prod";
  const region = env.UPSTASH_REGION ?? "us-east-1";
  if (DRY) {
    if (email && key) info(`(dry-run) would find/create Upstash db "${name}" (${region})`);
    else warn("(dry-run) need UPSTASH_REDIS_REST_URL+TOKEN, or UPSTASH_EMAIL+UPSTASH_API_KEY to provision");
    resolved.UPSTASH_REDIS_REST_URL = "https://DRY"; resolved.UPSTASH_REDIS_REST_TOKEN = "DRY";
    return;
  }
  if (!email || !key) die("Upstash REST URL + token are required — set them or UPSTASH_EMAIL+UPSTASH_API_KEY.");
  const auth = "Basic " + Buffer.from(`${email}:${key}`).toString("base64");
  const H = { Authorization: auth };

  const list = await api("https://api.upstash.com/v2/redis/databases", { headers: H });
  let db = (Array.isArray(list) ? list : []).find((d) => d.database_name === name);
  if (!db) {
    info(`Creating Upstash database "${name}" (${region})…`);
    db = await api("https://api.upstash.com/v2/redis/database", {
      method: "POST", headers: H, body: { name, region, tls: true },
    });
  } else {
    info(`Found Upstash database ${db.database_id} — reading token…`);
    db = await api(`https://api.upstash.com/v2/redis/database/${db.database_id}`, { headers: H });
  }
  const endpoint = db.endpoint;
  const token = db.rest_token;
  if (!endpoint || !token) die("Upstash returned no endpoint/rest_token.");
  resolved.UPSTASH_REDIS_REST_URL = `https://${endpoint}`;
  resolved.UPSTASH_REDIS_REST_TOKEN = token;
  info("Upstash REST creds resolved.");
}

// ── 3. Secrets + URL defaults ─────────────────────────────────────────────────
function fillDefaults() {
  step(3, "Secrets & defaults");
  if (!resolved.CRON_SECRET) {
    resolved.CRON_SECRET = randomBytes(24).toString("hex");
    info("Generated CRON_SECRET.");
  } else info("CRON_SECRET provided.");

  const appUrl = resolved.APP_URL ?? resolved.PUBLIC_BASE_URL;
  if (!appUrl) warn("APP_URL not set — OAuth redirects & absolute cookies need it. Set APP_URL=https://yourdomain.");
  else { take("APP_URL", appUrl); take("PUBLIC_BASE_URL", resolved.PUBLIC_BASE_URL ?? appUrl); }

  resolved.PAYMENTS_MODE = resolved.PAYMENTS_MODE ?? "mock";
  resolved.BACKEND_MODE  = resolved.BACKEND_MODE  ?? "mock";
  info(`PAYMENTS_MODE=${resolved.PAYMENTS_MODE}, BACKEND_MODE=${resolved.BACKEND_MODE}`);
}

// ── 4. Push env to Vercel ─────────────────────────────────────────────────────
function vercel(args, opts) {
  const tok = env.VERCEL_TOKEN ? ["--token", env.VERCEL_TOKEN] : [];
  return sh("vercel", [...args, ...tok, "--cwd", root], opts);
}

function pushVercelEnv() {
  step(4, "Vercel environment (production)");
  if (!existsSync(join(root, ".vercel", "project.json"))) {
    info("Linking Vercel project…");
    vercel(["link", "--yes"], { allowFail: true });
  }
  for (const [name, value] of Object.entries(resolved)) {
    info(`set ${name}`);
    vercel(["env", "rm", name, "production", "--yes"], { capture: true, allowFail: true });
    vercel(["env", "add", name, "production"], { input: `${value}\n`, capture: true });
  }
}

// ── 5. Schema ─────────────────────────────────────────────────────────────────
function applySchema() {
  step(5, "Database schema");
  sh("node", [join(here, "apply-schema.mjs")], { /* inherits resolved.DATABASE_URL below */ });
}

// ── 6. Deploy ─────────────────────────────────────────────────────────────────
function deploy() {
  step(6, "Deploy to Vercel (production)");
  const r = vercel(["deploy", "--prod", "--yes"], { capture: true });
  const out = (r.stdout || "").trim();
  if (out) console.log(out);
  const url = (out.match(/https:\/\/[^\s]+/g) || []).pop();
  return url;
}

// ── 7. Snapshot ───────────────────────────────────────────────────────────────
function rebuildSnapshot(siteUrl) {
  step(7, "Rebuild JSON snapshots");
  const base = resolved.APP_URL || siteUrl;
  if (!base) { warn("No site URL — skip snapshot. Run `npm run snapshot:rebuild` once DNS is live."); return; }
  sh("node", [join(here, "rebuild-snapshot.mjs")], { /* SNAPSHOT_URL/CRON_SECRET below */ });
}

// ── Run ───────────────────────────────────────────────────────────────────────
(async () => {
  await provisionNeon();
  await provisionUpstash();
  fillDefaults();

  // Make resolved values visible to the child scripts (apply-schema, snapshot).
  Object.assign(process.env, resolved);
  process.env.SNAPSHOT_URL = resolved.APP_URL ?? process.env.SNAPSHOT_URL ?? "";

  if (DRY) {
    step("✓", "Plan (dry run) — would push these env vars to Vercel:");
    for (const k of Object.keys(resolved)) console.log(`      ${k}=${k.match(/SECRET|TOKEN|URL|KEY/) ? "••••(hidden)" : resolved[k]}`);
    console.log("\nRe-run without --dry-run to execute.");
    return;
  }

  pushVercelEnv();
  applySchema();
  const url = deploy();
  rebuildSnapshot(url);

  step("✓", "Done");
  info(`Live: ${resolved.APP_URL || url || "(see Vercel output above)"}`);
  console.log("\nManual follow-ups (one-time): point your domain's DNS at Vercel, and");
  console.log("set OAuth/Stripe redirect+webhook URLs to your domain (see the deploy-prod skill).");
})();

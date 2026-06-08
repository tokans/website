#!/usr/bin/env node
/**
 * Apply the database schema (idempotent) without wiping data.
 *
 * Every schema*.sql uses CREATE TABLE/INDEX … IF NOT EXISTS, so re-running this
 * only adds what's missing (e.g. the new `user_journeys` table). Use it instead
 * of `local:reset` when you don't want to lose local data.
 *
 *   Local docker  (LOCAL_DB=1):  runs psql inside the `postgres` container.
 *   Remote (Neon):               runs your local `psql` against $DATABASE_URL.
 *
 * Usage:
 *   npm run db:schema                 # remote — needs psql + DATABASE_URL
 *   LOCAL_DB=1 npm run db:schema      # local docker stack (npm run local:up)
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { config } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

for (const f of [".env.development.local", ".env.local", ".env.development", ".env"]) {
  const p = join(root, f);
  if (existsSync(p)) config({ path: p, override: false });
}

// Order mirrors docker-compose.yml init scripts: base schema first, then the
// append-only feature schemas. Keep in sync when adding a schema.*.sql file.
const FILES = [
  "schema.sql",
  "schema.professionals.sql",
  "schema.partners.sql",
  "schema.payments.sql",
  "schema.apps.sql",
  "schema.tokan_task.sql",
];

const local = process.env.LOCAL_DB === "1" || process.argv.includes("--local");

function run(label, cmd, args, input) {
  process.stdout.write(`  → ${label} … `);
  const r = spawnSync(cmd, args, {
    input,
    encoding: "utf8",
    shell: process.platform === "win32", // resolve psql/docker via PATHEXT on Windows
  });
  if (r.error) {
    console.log("FAILED");
    throw r.error;
  }
  if (r.status !== 0) {
    console.log("FAILED");
    console.error(r.stderr || r.stdout);
    process.exit(1);
  }
  console.log("ok");
}

console.log(local ? "Applying schema to local docker postgres…" : "Applying schema to remote DATABASE_URL…");

if (!local) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. For the local docker stack use: LOCAL_DB=1 npm run db:schema");
    process.exit(1);
  }
  for (const f of FILES) {
    run(f, "psql", [url, "-v", "ON_ERROR_STOP=1", "-q", "-f", join(root, f)]);
  }
} else {
  // Feed each file to psql inside the running `postgres` service over stdin.
  for (const f of FILES) {
    const sql = readFileSync(join(root, f), "utf8");
    run(f, "docker", ["compose", "exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "main", "-v", "ON_ERROR_STOP=1", "-q"], sql);
  }
}

console.log("Schema applied.");

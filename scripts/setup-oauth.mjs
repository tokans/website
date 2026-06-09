#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Interactive OAuth setup helper for Tokans.
//
//   npm run setup:oauth            # configure .env.local      (local dev)
//   npm run setup:oauth -- --prod  # configure .env.deploy.local (production)
//
// Registering the OAuth apps themselves is manual (GitHub / Google consoles —
// there is no API for it).  This script does the rest: it prints the exact
// redirect URIs you must paste into those consoles, then collects the four
// secrets and writes them into the right env file without clobbering anything.
// ─────────────────────────────────────────────────────────────────────────────
import { createInterface } from "node:readline/promises";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROD = process.argv.includes("--prod");
const ENV_FILE = join(ROOT, PROD ? ".env.deploy.local" : ".env.local");

const B = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;
const GRN = (s) => `\x1b[32m${s}\x1b[0m`;
const YEL = (s) => `\x1b[33m${s}\x1b[0m`;

// ── Read existing env file (or start empty) ──────────────────────────────────
let lines = existsSync(ENV_FILE)
  ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/)
  : [];

function getEnv(key) {
  const re = new RegExp(`^${key}=(.*)$`);
  for (const l of lines) { const m = l.match(re); if (m) return m[1]; }
  return "";
}

// APP_URL drives the redirect URIs. Prefer the file, fall back to a sane default.
const appUrl =
  getEnv("APP_URL") || (PROD ? "https://tokans.org" : "http://localhost:3000");

const ghRedirect = `${appUrl}/api/auth/github-callback`;
const ggRedirect = `${appUrl}/api/auth/google-callback`;

console.log(`\n${B("═══ Tokans OAuth setup ═══")}  ${DIM(PROD ? "(production)" : "(local dev)")}`);
console.log(`Target file: ${B(ENV_FILE)}`);
console.log(`APP_URL:     ${B(appUrl)}\n`);

console.log(B("1) GitHub  → https://github.com/settings/developers  (New OAuth App)"));
console.log(`   Homepage URL:              ${appUrl}`);
console.log(`   Authorization callback:    ${YEL(ghRedirect)}\n`);
console.log(B("2) Google  → https://console.cloud.google.com  (Credentials → OAuth client ID → Web application)"));
console.log(`   Authorized redirect URI:   ${YEL(ggRedirect)}\n`);
console.log(DIM("Register both, then paste the values below. Leave blank to keep the current value.\n"));

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function prompt(key, label) {
  const cur = getEnv(key);
  const shown = cur ? ` ${DIM(`[current: ${cur.slice(0, 6)}…]`)}` : "";
  const ans = (await rl.question(`${label}${shown}: `)).trim();
  return ans || cur;
}

const values = {
  GITHUB_CLIENT_ID:     await prompt("GITHUB_CLIENT_ID",     "GitHub Client ID"),
  GITHUB_CLIENT_SECRET: await prompt("GITHUB_CLIENT_SECRET", "GitHub Client Secret"),
  GOOGLE_CLIENT_ID:     await prompt("GOOGLE_CLIENT_ID",     "Google Client ID"),
  GOOGLE_CLIENT_SECRET: await prompt("GOOGLE_CLIENT_SECRET", "Google Client Secret"),
};
rl.close();

// ── Upsert each key: replace existing line, else append ──────────────────────
for (const [key, val] of Object.entries(values)) {
  const re = new RegExp(`^${key}=.*$`);
  const idx = lines.findIndex((l) => re.test(l));
  const line = `${key}=${val}`;
  if (idx >= 0) lines[idx] = line;
  else lines.push(line);
}

// Tidy trailing blank lines, keep one terminating newline.
while (lines.length && lines[lines.length - 1] === "") lines.pop();
writeFileSync(ENV_FILE, lines.join("\n") + "\n");

const filled = Object.values(values).filter(Boolean).length;
console.log(`\n${GRN("✓")} Wrote ${filled}/4 values to ${B(ENV_FILE)}`);

if (PROD) {
  console.log(DIM(`\nNext: run ${B("npm run deploy")} to push these to Vercel and ship.`));
} else {
  console.log(DIM(`\nNext: run ${B("npm run local")} and try the GitHub / Google buttons on /login.`));
  console.log(DIM(`(Make sure your OAuth apps' callback URLs match ${appUrl} exactly.)`));
}

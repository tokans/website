#!/usr/bin/env node
/**
 * Validate that an app's README yields a usable Tokans directory listing.
 *
 * The /apps directory shows each app's tagline + description, both parsed from
 * its README (see scripts/lib/appReadme.mjs). This script fails (exit 1) when a
 * README can't supply them, so an app's listing never silently goes blank.
 *
 * CI-agnostic — run it as a plain node step in whatever pipeline an app uses:
 *
 *     node scripts/validate-app-readme.mjs            # validate ./README.md
 *     node scripts/validate-app-readme.mjs ../myHealth # validate another app dir
 *     node scripts/validate-app-readme.mjs README.md   # or a specific file
 *
 * To use it inside another app's repo, copy BOTH this file and
 * scripts/lib/appReadme.mjs (keep the relative ./lib/ path), then add e.g.
 *   "validate:readme": "node scripts/validate-app-readme.mjs"
 * to that app's package.json and call it from its CI.
 */
import { resolve, dirname, basename } from "node:path";
import { existsSync, statSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAppReadme, findReadme } from "./lib/appReadme.mjs";

const MIN_TAGLINE = 10;
const MIN_DESCRIPTION = 30;

const arg = process.argv[2] ?? ".";
const target = resolve(arg);

if (!existsSync(target)) {
  console.error(`✗ path not found: ${target}`);
  process.exit(1);
}

// Accept either a directory (find its README) or a README file directly.
let readmePath;
if (statSync(target).isFile()) {
  readmePath = target;
} else {
  readmePath = findReadme(target);
  if (!readmePath) {
    console.error(`✗ ${basename(target)}: no README.md found.`);
    console.error(`  Add a README following docs/app-readme-template.md.`);
    process.exit(1);
  }
}

const { tagline, description } = parseAppReadme(readFileSync(readmePath, "utf8"));
const rel = readmePath.replace(resolve(dirname(fileURLToPath(import.meta.url)), "..") + "\\", "");

const problems = [];
if (!tagline || tagline.length < MIN_TAGLINE) {
  problems.push(
    `tagline missing or too short (need ≥ ${MIN_TAGLINE} chars) — got ${
      tagline ? `"${tagline}"` : "nothing"
    }`
  );
}
if (!description || description.length < MIN_DESCRIPTION) {
  problems.push(
    `description missing or too short (need ≥ ${MIN_DESCRIPTION} chars) — got ${
      description ? `"${description.slice(0, 40)}…"` : "nothing"
    }`
  );
}

if (problems.length) {
  console.error(`✗ ${rel}: cannot derive a directory listing.`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(`\n  Fix: ensure the README opens with an H1, then a one-line`);
  console.error(`  tagline and a short description paragraph before the first`);
  console.error(`  '## ' heading. See docs/app-readme-template.md.`);
  process.exit(1);
}

console.log(`✓ ${rel}`);
console.log(`  tagline:     ${tagline}`);
console.log(`  description: ${description}`);

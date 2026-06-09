#!/usr/bin/env node
/**
 * Refreshes the vendored myWorkAssistant embed bundle.
 *
 * myWorkAssistant is a sibling repo (../../myWorkAssistant). Its prebuilt embed
 * bundle is a self-contained ES module (it bundles its own React 18) plus a
 * stylesheet and a couple of code-split chunks. We vendor that built output into
 * public/vendor/myworkassistant/ and commit it, so Vercel — which only uploads
 * THIS repo — can serve it without ever resolving a local `file:` dependency.
 *
 * Run this after rebuilding the bundle in the sibling repo:
 *   (cd ../../myWorkAssistant && npm run build:embed)
 *   npm run sync:mwa
 *
 * Then commit the changes under public/vendor/myworkassistant/.
 */
import { cp, rm, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const SRC = resolve(repoRoot, "../../myWorkAssistant/dist-embed");
const DEST = resolve(repoRoot, "public/vendor/myworkassistant");

if (!existsSync(SRC)) {
  console.error(`✗ Source bundle not found: ${SRC}`);
  console.error("  Build it first:  (cd ../../myWorkAssistant && npm run build:embed)");
  process.exit(1);
}

await rm(DEST, { recursive: true, force: true });
await mkdir(DEST, { recursive: true });
await cp(SRC, DEST, { recursive: true });

const files = await readdir(DEST);
let total = 0;
for (const f of files) total += (await stat(resolve(DEST, f))).size;
console.log(`✓ Synced ${files.length} file(s) → public/vendor/myworkassistant/ (${(total / 1024).toFixed(0)} KB)`);
console.log("  Remember to commit the changes.");

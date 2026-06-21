import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../lib/db.js";
import { withErrorHandling } from "../../lib/handler.js";
import { type AppRow } from "../../lib/apps.js";
import type { AppContent, AppDownloadOs } from "../../lib/backend/contract.js";
import { resolveLatestAsset } from "../../lib/githubReleases.js";

/** Canonical v4 UUID shape — distinguishes an `id` lookup from a `slug` lookup. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OSES: readonly AppDownloadOs[] = ["windows", "macos", "linux", "android"];

/**
 * GET /api/apps/<id-or-slug>/download?os=<windows|macos|linux|android>
 *
 * Resolves the app's repo and 302-redirects to the *latest* GitHub release asset
 * for the requested platform — so download links never go stale when a new
 * version ships (the stored apps.content.downloads URLs are only a fallback). The
 * /apps/<slug> page links its buttons here instead of at a version-pinned URL.
 */
export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const idParam = req.query["id"];
  const idOrSlug = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!idOrSlug) {
    res.status(400).json({ error: "App id or slug is required" });
    return;
  }

  const osParam = req.query["os"];
  const os = (Array.isArray(osParam) ? osParam[0] : osParam) as AppDownloadOs | undefined;
  if (!os || !OSES.includes(os)) {
    res.status(400).json({ error: "A valid os query param is required" });
    return;
  }

  // Only repo_url (to find releases) and content (the fallback URL) are needed.
  const sql = getDb();
  const rows = (UUID_RE.test(idOrSlug)
    ? await sql`SELECT repo_url, content FROM apps WHERE id = ${idOrSlug} LIMIT 1`
    : await sql`SELECT repo_url, content FROM apps WHERE slug = ${idOrSlug.toLowerCase()} LIMIT 1`) as Pick<
    AppRow,
    "repo_url" | "content"
  >[];

  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  // Prefer the live latest-release asset; fall back to the seeded URL.
  let target = row.repo_url ? await resolveLatestAsset(row.repo_url, os) : null;
  if (!target) {
    const stored = (row.content as AppContent | null)?.downloads?.find((d) => d.os === os);
    target = stored?.url ?? null;
  }

  // Guard against an unexpected non-https target (open-redirect belt-and-braces).
  if (!target || !/^https:\/\//i.test(target)) {
    res.status(404).json({ error: "No download is available for this platform" });
    return;
  }

  // Short cache: lets a CDN/browser reuse the redirect briefly without pinning it
  // past a release (the asset URL itself is resolved fresh each cache miss).
  res.setHeader("Cache-Control", "public, max-age=300");
  res.redirect(302, target);
});

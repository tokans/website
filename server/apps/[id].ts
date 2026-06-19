import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { getSession, getSessionId } from "../lib/session.js";
import { withErrorHandling } from "../lib/handler.js";
import { type AppRow, mapAppDetail } from "../lib/apps.js";

/** Canonical v4 UUID shape — distinguishes an `id` lookup from a `slug` lookup. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // The /apps/<slug> detail page resolves by slug; the directory's per-app links
  // resolve by UUID. Pick the column by shape so one endpoint serves both. Slugs
  // are always lowercase (slugify), so match case-insensitively to tolerate
  // legacy links like /apps/myFinance.
  const sql = getDb();
  const rows = (UUID_RE.test(idOrSlug)
    ? await sql`
        SELECT id, slug, name, tagline, repo_url, stack, description,
               icon_url, site_url, uses_sharedcorelib, support_status, listed,
               owner_user_id, content
        FROM apps WHERE id = ${idOrSlug} LIMIT 1`
    : await sql`
        SELECT id, slug, name, tagline, repo_url, stack, description,
               icon_url, site_url, uses_sharedcorelib, support_status, listed,
               owner_user_id, content
        FROM apps WHERE slug = ${idOrSlug.toLowerCase()} LIMIT 1`) as AppRow[];

  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const session = await getSession(getSessionId(req));
  res.status(200).json(mapAppDetail(row, session?.userId ?? null));
});

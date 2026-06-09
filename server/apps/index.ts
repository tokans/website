import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { getSession, getSessionId, requireSession } from "../lib/session.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import { type AppRow, mapAppRow, slugify } from "../lib/apps.js";
import { readAppsSnapshot } from "../lib/snapshot.js";

interface RegisterBody {
  name?: string;
  slug?: string;
  tagline?: string | null;
  repoUrl?: string | null;
  stack?: string | null;
  description?: string | null;
  usesSharedCoreLib?: boolean;
}

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const sql = getDb();

  // ── Public directory listing ───────────────────────────────────────────────
  if (req.method === "GET") {
    const session = await getSession(getSessionId(req));
    const viewer = session?.userId ?? null;

    // Pre-login (anonymous) traffic is served from the daily JSON snapshot to
    // keep steady-state reads off the DB. Logged-in viewers hit the DB so the
    // per-viewer isOwner flag is correct. Cold cache → DB fallback.
    if (!viewer) {
      const snap = await readAppsSnapshot();
      if (snap) {
        res.status(200).json({ apps: snap.apps });
        return;
      }
    }

    const rows = (await sql`
      SELECT id, slug, name, tagline, repo_url, stack, description,
             icon_url, uses_sharedcorelib, support_status, listed, owner_user_id
      FROM apps WHERE listed = TRUE ORDER BY name
    `) as AppRow[];
    res.status(200).json({ apps: rows.map((r) => mapAppRow(r, viewer)) });
    return;
  }

  // ── Register / claim an app (owner) ─────────────────────────────────────────
  if (req.method === "POST") {
    if (!requireJsonContent(req, res)) return;
    if (!verifyCsrf(req, res)) return;
    const session = await requireSession(req, res);
    if (!session) return;

    const body = (req.body ?? {}) as RegisterBody;
    const name = (body.name ?? "").trim();
    if (!name) {
      res.status(400).json({ error: "App name is required" });
      return;
    }
    const slug = (body.slug ?? slugify(name)).trim();
    if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
      res.status(400).json({ error: "Invalid slug (use lowercase letters, digits, hyphens)" });
      return;
    }

    const rows = (await sql`
      INSERT INTO apps (owner_user_id, slug, name, tagline, repo_url, stack, description, uses_sharedcorelib)
      VALUES (${session.userId}, ${slug}, ${name}, ${body.tagline ?? null}, ${body.repoUrl ?? null},
              ${body.stack ?? null}, ${body.description ?? null}, ${body.usesSharedCoreLib ?? true})
      ON CONFLICT (slug) DO NOTHING
      RETURNING id, slug, name, tagline, repo_url, stack, description,
                icon_url, uses_sharedcorelib, support_status, listed, owner_user_id
    `) as AppRow[];

    const row = rows[0];
    if (!row) {
      res.status(409).json({ error: "An app with that slug already exists" });
      return;
    }
    ensureCsrfToken(req, res);
    res.status(201).json(mapAppRow(row, session.userId));
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

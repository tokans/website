import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { getSession, getSessionId } from "../lib/session.js";
import { withErrorHandling } from "../lib/handler.js";
import { type AppRow, mapAppRow } from "../lib/apps.js";

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const idParam = req.query["id"];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    res.status(400).json({ error: "App id is required" });
    return;
  }

  const sql = getDb();
  const rows = (await sql`
    SELECT id, slug, name, tagline, repo_url, stack, description,
           uses_sharedcorelib, support_status, listed, owner_user_id
    FROM apps WHERE id = ${id} LIMIT 1
  `) as AppRow[];

  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "App not found" });
    return;
  }

  const session = await getSession(getSessionId(req));
  res.status(200).json(mapAppRow(row, session?.userId ?? null));
});

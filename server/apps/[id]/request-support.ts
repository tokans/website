import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../../lib/db.js";
import { requireSession } from "../../lib/session.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../../lib/csrf.js";
import { withErrorHandling } from "../../lib/handler.js";
import { getBackend, identityFromSession } from "../../lib/backend/index.js";
import { type AppRow } from "../../lib/apps.js";

/**
 * Owner initiates the acceptance workflow to get their app listed for Tokans
 * support. P0: ownership is checked here, then the backend marks it 'requested'.
 * The real review/approve workflow (BE Workflow.NewTask → listed) is a later TODO.
 */
export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireJsonContent(req, res)) return;
  if (!verifyCsrf(req, res)) return;

  const session = await requireSession(req, res);
  if (!session) return;

  const idParam = req.query["id"];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    res.status(400).json({ error: "App id is required" });
    return;
  }

  const sql = getDb();
  const rows = (await sql`
    SELECT owner_user_id FROM apps WHERE id = ${id} LIMIT 1
  `) as Pick<AppRow, "owner_user_id">[];
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "App not found" });
    return;
  }
  if (row.owner_user_id !== session.userId) {
    res.status(403).json({ error: "Only the app owner can request support" });
    return;
  }

  const updated = await getBackend().requestAppSupport(identityFromSession(session), id);
  ensureCsrfToken(req, res);
  res.status(200).json(updated);
});

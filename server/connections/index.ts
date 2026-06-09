import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { requireSession } from "../lib/session.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import { getBackend, identityFromSession } from "../lib/backend/index.js";

interface ConnectBody {
  professionalUserId?: string;
  message?: string;
}

/**
 * An end-user connects to a professional. Records the connection and asks the
 * backend to create a work item (NewTask) routed to the professional's inbox.
 * The end-user registers (signs in) at this point — minimal, privacy-first.
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

  const body = (req.body ?? {}) as ConnectBody;
  const professionalUserId = (body.professionalUserId ?? "").trim();
  const message = (body.message ?? "").trim();
  if (!professionalUserId) {
    res.status(400).json({ error: "professionalUserId is required" });
    return;
  }
  if (professionalUserId === session.userId) {
    res.status(400).json({ error: "You can't connect to yourself" });
    return;
  }

  const sql = getDb();
  const inserted = (await sql`
    INSERT INTO connections (end_user_id, professional_user_id, message, status)
    VALUES (${session.userId}, ${professionalUserId}, ${message || null}, 'open')
    RETURNING id
  `) as { id: string }[];
  const connectionId = inserted[0]?.id;
  if (!connectionId) {
    res.status(500).json({ error: "Could not create connection" });
    return;
  }

  // Route to the backend workflow (REST) → professional's inbox.
  const task = await getBackend().createWorkItem(identityFromSession(session), {
    professionalUserId,
    requesterUserId: session.userId,
    message,
    kind: "Connection",
  });

  await sql`
    UPDATE connections SET backend_workitem_id = ${task.workItemId}, status = ${task.status}
    WHERE id = ${connectionId}
  `;

  ensureCsrfToken(req, res);
  res.status(201).json({ connectionId, workItemId: task.workItemId, status: task.status });
});

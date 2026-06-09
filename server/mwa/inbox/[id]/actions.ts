import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession } from "../../../lib/session.js";
import { withErrorHandling } from "../../../lib/handler.js";
import { applyAction, inboxItems } from "../../../lib/mwaInbox.js";

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const session = await requireSession(req, res);
  if (!session) return;

  const itemId = String(req.query.id);
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const action = String(body?.action ?? "");
  if (!["approve", "reject", "handoff", "complete"].includes(action)) {
    res.status(400).json({ error: "invalid action" });
    return;
  }
  const item = inboxItems().find((i) => i.id === itemId);
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Stateless mock: return the item with the action applied (not persisted).
  res.status(200).json(applyAction(item, action));
});

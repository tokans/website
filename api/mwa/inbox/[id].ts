import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession } from "../../lib/session.js";
import { withErrorHandling } from "../../lib/handler.js";
import { inboxItems } from "../../lib/mwaInbox.js";

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const session = await requireSession(req, res);
  if (!session) return;

  const id = String(req.query.id);
  const item = inboxItems().find((i) => i.id === id) ?? null;
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(200).json(item);
});

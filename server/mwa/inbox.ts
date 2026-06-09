import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession } from "../lib/session.js";
import { withErrorHandling } from "../lib/handler.js";
import { inboxItems } from "../lib/mwaInbox.js";

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

  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : undefined;

  let items = inboxItems();
  if (status) items = items.filter((i) => i.status === status);
  if (q) {
    items = items.filter(
      (i) => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q),
    );
  }
  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.status(200).json(items);
});

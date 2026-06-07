import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession } from "../../../lib/session.js";
import { withErrorHandling } from "../../../lib/handler.js";
import { inboxComments } from "../../../lib/mwaInbox.js";

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const session = await requireSession(req, res);
  if (!session) return;

  const itemId = String(req.query.id);

  if (req.method === "GET") {
    res.status(200).json(inboxComments(itemId));
    return;
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const text = String(body?.body ?? "").trim();
    if (!text) {
      res.status(400).json({ error: "body is required" });
      return;
    }
    // Stateless mock: echo the created comment (not persisted).
    res.status(201).json({
      id: `c_${Date.now()}`,
      itemId,
      author: session.name ?? session.email ?? "You",
      body: text,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

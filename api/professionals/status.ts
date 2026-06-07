import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession } from "../lib/session.js";
import { withErrorHandling } from "../lib/handler.js";
import { getBackend, identityFromSession } from "../lib/backend/index.js";

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = await requireSession(req, res);
  if (!session) return;

  const status = await getBackend().getProfessionalStatus(
    identityFromSession(session)
  );
  res.status(200).json(status);
});

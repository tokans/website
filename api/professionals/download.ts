import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession } from "../lib/session.js";
import { withErrorHandling } from "../lib/handler.js";
import { getBackend, identityFromSession } from "../lib/grpc.js";

/**
 * The download gate. Always 200 with `{ eligible, url?, reason? }` so the SPA can
 * render the reason without try/catch — eligibility (not HTTP status) is the signal.
 */
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

  const grant = await getBackend().grantDownload(identityFromSession(session));
  res.status(200).json(grant);
});

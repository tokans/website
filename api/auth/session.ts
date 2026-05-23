import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionId, getSession } from "../lib/session.js";
import { withErrorHandling } from "../lib/handler.js";
import type { SessionResponse } from "../lib/types.js";

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sid     = getSessionId(req);
  const session = await getSession(sid);

  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }

  const body: SessionResponse = { authenticated: true, user: session };
  res.status(200).json(body);
});

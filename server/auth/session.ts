import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionId, getSession } from "../lib/session.js";
import { getDb } from "../lib/db.js";
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

  // Enrich with the per-path journeys this user has completed (authoritative
  // from the DB) so each entry-path journey runs exactly once, even for users
  // who signed in this session rather than completing onboarding just now.
  let completedJourneys = session.completedJourneys ?? [];
  try {
    const rows = await getDb()`
      SELECT entry_path FROM user_journeys WHERE user_id = ${session.userId}
    `;
    completedJourneys = rows.map((r) => r["entry_path"] as string);
  } catch {
    // user_journeys table not present yet — fall back to the session payload.
  }

  const body: SessionResponse = {
    authenticated: true,
    user: { ...session, completedJourneys },
  };
  res.status(200).json(body);
});

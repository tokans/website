import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionId, deleteSession, clearSessionCookie } from "../lib/session.js";
import { verifyCsrf } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!verifyCsrf(req, res)) return;

  const sid = getSessionId(req);
  await deleteSession(sid);
  clearSessionCookie(res, req);

  res.status(200).json({ ok: true });
});

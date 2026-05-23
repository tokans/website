import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import {
  requireSession,
  createSession,
  setSessionCookie,
} from "../lib/session.js";
import { getRedis } from "../lib/redis.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import type { OnboardingCompleteBody } from "../lib/types.js";

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

  const { role, subType, context } = (req.body ?? {}) as OnboardingCompleteBody;

  if (!role) {
    res.status(400).json({ error: "Role is required" });
    return;
  }

  const sql            = getDb();
  const contextJson    = JSON.stringify(context ?? {});
  const subTypeOrNull  = subType ?? null;

  await sql`
    INSERT INTO onboarding_data (user_id, role, sub_type, context)
    VALUES (${session.userId}, ${role}, ${subTypeOrNull}, ${contextJson})
    ON CONFLICT (user_id)
    DO UPDATE SET
      role         = EXCLUDED.role,
      sub_type     = EXCLUDED.sub_type,
      context      = EXCLUDED.context,
      completed_at = NOW()
  `;

  await sql`
    INSERT INTO user_roles (user_id, role, sub_type)
    VALUES (${session.userId}, ${role}, ${subTypeOrNull})
    ON CONFLICT (user_id, role)
    DO UPDATE SET sub_type = EXCLUDED.sub_type
  `;

  // Rotate session: drop the old one, mint a new ID with refreshed payload.
  await getRedis().del(`session:${session.sessionId}`);

  const newSessionId = await createSession({
    userId:             session.userId,
    name:               session.name,
    email:              session.email,
    onboardingComplete: true,
    role,
    subType:            subTypeOrNull,
  });

  setSessionCookie(res, newSessionId, req);
  ensureCsrfToken(req, res);
  res.status(200).json({ ok: true });
});

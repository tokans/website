import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/db.js";
import { createSession, setSessionCookie } from "../lib/session.js";
import { checkRateLimit } from "../lib/ratelimit.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import type { DbUser, AuthResponse, RoleId, SubType } from "../lib/types.js";

type SigninUser = Pick<DbUser, "id" | "name" | "email" | "password_hash"> & {
  onboarding_complete: boolean;
  role: RoleId | null;
  sub_type: SubType | null;
};

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
  // Two layers: per-IP burst protection + per-email lockout protection.
  if (!(await checkRateLimit(req, res, { bucket: "signin:ip", windowSec: 60, max: 10 }))) return;

  const { email, password } = (req.body ?? {}) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const normEmail = email.toLowerCase().trim();
  if (
    !(await checkRateLimit(req, res, {
      bucket: "signin:email",
      windowSec: 600,
      max: 5,
      key: normEmail,
    }))
  ) {
    return;
  }

  const sql = getDb();

  const [user] = await sql`
    SELECT
      u.id, u.name, u.email, u.password_hash,
      EXISTS (
        SELECT 1 FROM onboarding_data od WHERE od.user_id = u.id
      ) AS onboarding_complete,
      od.role     AS role,
      od.sub_type AS sub_type
    FROM users u
    LEFT JOIN onboarding_data od ON od.user_id = u.id
    WHERE u.email = ${normEmail}
  ` as SigninUser[];

  if (!user?.password_hash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const sessionId = await createSession({
    userId:             user.id,
    name:               user.name,
    email:              user.email,
    onboardingComplete: user.onboarding_complete,
    ...(user.role     ? { role:    user.role }    : {}),
    ...(user.sub_type ? { subType: user.sub_type } : {}),
  });

  setSessionCookie(res, sessionId, req);
  ensureCsrfToken(req, res);

  const body: AuthResponse = {
    user: { id: user.id, name: user.name, email: user.email },
    onboardingComplete: user.onboarding_complete,
  };
  res.status(200).json(body);
});

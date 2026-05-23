import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/db.js";
import { createSession, setSessionCookie } from "../lib/session.js";
import { checkRateLimit } from "../lib/ratelimit.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import type { DbUser, AuthResponse } from "../lib/types.js";

type UserIdentity = Pick<DbUser, "id" | "name" | "email">;

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
  if (!(await checkRateLimit(req, res, { bucket: "signup", windowSec: 3600, max: 10 }))) return;

  const { name, email, password } = (req.body ?? {}) as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (
    !name?.trim() ||
    !email?.includes("@") ||
    !password ||
    password.length < 8
  ) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const sql = getDb();
  const normEmail = email.toLowerCase().trim();

  const [existing] = await sql`
    SELECT id FROM users WHERE email = ${normEmail}
  ` as Pick<DbUser, "id">[];
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name.trim()}, ${normEmail}, ${passwordHash})
    RETURNING id, name, email
  ` as UserIdentity[];

  if (!user) {
    res.status(500).json({ error: "Failed to create user" });
    return;
  }

  const sessionId = await createSession({
    userId: user.id,
    name:   user.name,
    email:  user.email,
    onboardingComplete: false,
  });

  setSessionCookie(res, sessionId, req);
  // Refresh CSRF token alongside the new session.
  ensureCsrfToken(req, res);

  const body: AuthResponse = {
    user: { id: user.id, name: user.name, email: user.email },
    onboardingComplete: false,
  };
  res.status(201).json(body);
});

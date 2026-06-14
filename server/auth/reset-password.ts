import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";

interface ResetPayload {
  userId: string;
  email: string;
}

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

  const { token, password } = (req.body ?? {}) as {
    token?: string;
    password?: string;
  };

  if (!token || !password || password.length < 8) {
    res.status(400).json({ error: "Token and a password of at least 8 characters are required" });
    return;
  }

  const payload = await getRedis().get<ResetPayload>(`reset:${token}`);
  if (!payload) {
    res.status(400).json({ error: "This reset link has expired or is invalid. Please request a new one." });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const sql = getDb();
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${payload.userId}`;
  await getRedis().del(`reset:${token}`);

  ensureCsrfToken(req, res);
  res.status(200).json({ ok: true });
});

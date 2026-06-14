import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/db.js";
import { requireSession, getSessionId } from "../lib/session.js";
import { requireJsonContent, verifyCsrf } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";

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

  const { currentPassword, newPassword } = (req.body ?? {}) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "Current password and a new password of at least 8 characters are required" });
    return;
  }

  const sql = getDb();
  const [user] = await sql`
    SELECT id, password_hash FROM users WHERE id = ${session.userId}
  ` as { id: string; password_hash: string | null }[];

  if (!user?.password_hash) {
    res.status(400).json({ error: "Password change is not available for accounts signed in with GitHub or Google. Use your provider's settings instead." });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${session.userId}`;

  res.status(200).json({ ok: true });
});

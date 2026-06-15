import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { withErrorHandling } from "../lib/handler.js";

interface EmailVerifyPayload {
  userId: string;
}

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const appUrl = process.env["APP_URL"] ?? "";
  const token = req.query["token"] as string | undefined;

  if (!token) {
    res.redirect(302, `${appUrl}/login?verify_error=missing_token`);
    return;
  }

  const redis = getRedis();
  const payload = await redis.get<EmailVerifyPayload>(`email_verify:${token}`);
  if (!payload) {
    res.redirect(302, `${appUrl}/login?verify_error=expired`);
    return;
  }

  const sql = getDb();
  await sql`UPDATE users SET email_verified = true WHERE id = ${payload.userId}`;
  await redis.del(`email_verify:${token}`);

  res.redirect(302, `${appUrl}/app?verified=email`);
});

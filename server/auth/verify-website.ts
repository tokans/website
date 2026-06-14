import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { withErrorHandling } from "../lib/handler.js";

interface VerifyPayload {
  userId: string;
  websiteUrl: string;
  email: string;
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
  const raw = await redis.get<string>(`ws_verify:${token}`);
  if (!raw) {
    res.redirect(302, `${appUrl}/login?verify_error=expired`);
    return;
  }

  let payload: VerifyPayload;
  try {
    payload = JSON.parse(raw) as VerifyPayload;
  } catch {
    res.redirect(302, `${appUrl}/login?verify_error=invalid`);
    return;
  }

  const sql = getDb();
  await sql`
    UPDATE users
    SET website_url = ${payload.websiteUrl}, is_verified = true
    WHERE id = ${payload.userId}
  `;

  await redis.del(`ws_verify:${token}`);

  res.redirect(302, `${appUrl}/app?verified=website`);
});

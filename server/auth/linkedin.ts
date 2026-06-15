import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "crypto";
import { getRedis } from "../lib/redis.js";
import { withErrorHandling } from "../lib/handler.js";

const STATE_TTL = 60 * 10; // 10 minutes

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const clientId = process.env["LINKEDIN_CLIENT_ID"];
  if (!clientId) {
    res.status(500).json({ error: "LinkedIn OAuth is not configured" });
    return;
  }

  const appUrl = process.env["APP_URL"] ?? "";
  const state = randomBytes(16).toString("hex");
  await getRedis().set(`li_oauth_state:${state}`, { popup: true }, { ex: STATE_TTL });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${appUrl}/api/auth/linkedin-callback`,
    state,
    scope: "openid profile email",
  });

  res.redirect(302, `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`);
});

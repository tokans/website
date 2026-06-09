import type { VercelRequest, VercelResponse } from "@vercel/node";
import { issueOAuthState } from "../lib/oauthState.js";
import { withErrorHandling } from "../lib/handler.js";

export default withErrorHandling(function handler(
  req: VercelRequest,
  res: VercelResponse
): void {
  const clientId = process.env["GOOGLE_CLIENT_ID"] ?? "";
  const appUrl   = process.env["APP_URL"]           ?? "";

  const state = issueOAuthState(req, res, "google");

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  `${appUrl}/api/auth/google-callback`,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "online",
    state,
  });

  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

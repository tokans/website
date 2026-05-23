import type { VercelRequest, VercelResponse } from "@vercel/node";
import { issueOAuthState } from "../lib/oauthState.js";
import { withErrorHandling } from "../lib/handler.js";

export default withErrorHandling(function handler(
  req: VercelRequest,
  res: VercelResponse
): void {
  const clientId = process.env["GITHUB_CLIENT_ID"] ?? "";
  const appUrl   = process.env["APP_URL"]          ?? "";

  const state = issueOAuthState(req, res, "github");

  const params = new URLSearchParams({
    client_id:    clientId,
    redirect_uri: `${appUrl}/api/auth/github-callback`,
    scope:        "user:email",
    state,
  });

  res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
});

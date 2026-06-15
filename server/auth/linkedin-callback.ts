import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { getSessionId, getSession } from "../lib/session.js";
import { withErrorHandling } from "../lib/handler.js";

interface LinkedInUserInfo {
  sub:        string;
  name?:      string;
  given_name?: string;
  family_name?: string;
  email?:     string;
  picture?:   string;
}

function popupHtml(payload: object): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><script>
try {
  if (window.opener) {
    window.opener.postMessage(${JSON.stringify({ type: "linkedin-verified", ...payload })}, "*");
  }
} catch(e) {}
window.close();
</script></body></html>`;
}

function errorHtml(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><script>
try {
  if (window.opener) {
    window.opener.postMessage(${JSON.stringify({ type: "linkedin-error", message })}, "*");
  }
} catch(e) {}
window.close();
</script></body></html>`;
}

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const clientId     = process.env["LINKEDIN_CLIENT_ID"]     ?? "";
  const clientSecret = process.env["LINKEDIN_CLIENT_SECRET"] ?? "";
  const appUrl       = process.env["APP_URL"]                ?? "";

  const code  = req.query["code"]  as string | undefined;
  const state = req.query["state"] as string | undefined;
  const error = req.query["error"] as string | undefined;

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (error || !code || !state) {
    res.status(200).send(errorHtml(error ?? "LinkedIn sign-in was cancelled"));
    return;
  }

  // Validate state
  const redis = getRedis();
  const stateData = await redis.get(`li_oauth_state:${state}`);
  if (!stateData) {
    res.status(200).send(errorHtml("Session expired — please try again"));
    return;
  }
  await redis.del(`li_oauth_state:${state}`);

  // Exchange code for access token
  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  `${appUrl}/api/auth/linkedin-callback`,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    res.status(200).send(errorHtml("Failed to exchange LinkedIn code"));
    return;
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    res.status(200).send(errorHtml("No access token returned from LinkedIn"));
    return;
  }

  // Fetch user info
  const userRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    res.status(200).send(errorHtml("Failed to fetch LinkedIn profile"));
    return;
  }

  const profile = (await userRes.json()) as LinkedInUserInfo;
  const linkedinId = profile.sub;
  const displayName = profile.name ?? [profile.given_name, profile.family_name].filter(Boolean).join(" ") ?? null;

  // Find the logged-in user from their session cookie and update their record.
  const sid = getSessionId(req);
  const session = await getSession(sid);

  if (!session) {
    res.status(200).send(errorHtml("You must be signed in to verify with LinkedIn"));
    return;
  }

  const sql = getDb();
  await sql`
    UPDATE users
    SET linkedin_id = ${linkedinId}, linkedin_verified = true
    WHERE id = ${session.userId}
  `;

  res.status(200).send(popupHtml({ linkedinId, displayName }));
});

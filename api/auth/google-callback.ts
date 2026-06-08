import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { createSession, setSessionCookie } from "../lib/session.js";
import { ensureCsrfToken } from "../lib/csrf.js";
import { verifyOAuthState } from "../lib/oauthState.js";
import { withErrorHandling } from "../lib/handler.js";
import type {
  DbUser,
  GoogleProfile,
  GoogleTokenResponse,
} from "../lib/types.js";

type UserIdentity = Pick<DbUser, "id" | "name" | "email">;

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const appUrl       = process.env["APP_URL"]              ?? "";
  const clientId     = process.env["GOOGLE_CLIENT_ID"]     ?? "";
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"] ?? "";

  const code  = req.query["code"]  as string | undefined;
  const error = req.query["error"] as string | undefined;
  const state = req.query["state"] as string | undefined;

  if (error || !code) {
    res.redirect(302, `${appUrl}/login?oauth_error=google`);
    return;
  }

  if (!verifyOAuthState(req, res, "google", state)) {
    res.redirect(302, `${appUrl}/login?oauth_error=state`);
    return;
  }

  // ── Exchange code for tokens ───────────────────────────────────────────────
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  `${appUrl}/api/auth/google-callback`,
      grant_type:    "authorization_code",
    }),
  });

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokens.access_token) {
    res.redirect(302, `${appUrl}/login?oauth_error=google`);
    return;
  }

  // ── Fetch user info ────────────────────────────────────────────────────────
  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const profile = (await profileRes.json()) as GoogleProfile;

  if (!profile.email || !profile.verified_email) {
    res.redirect(302, `${appUrl}/login?oauth_error=no_email`);
    return;
  }

  const sql       = getDb();
  const normEmail = profile.email.toLowerCase();

  // ── Find or create user ───────────────────────────────────────────────────
  let [user] = await sql`
    SELECT id, name, email FROM users WHERE google_id = ${profile.id}
  ` as UserIdentity[];

  if (!user) {
    const [existing] = await sql`
      SELECT id, name, email FROM users WHERE email = ${normEmail}
    ` as UserIdentity[];

    if (existing) {
      await sql`
        UPDATE users
        SET google_id  = ${profile.id},
            avatar_url = COALESCE(avatar_url, ${profile.picture}),
            is_verified = true
        WHERE id = ${existing.id}
      `;
      user = existing;
    } else {
      const [created] = await sql`
        INSERT INTO users (name, email, google_id, avatar_url, is_verified)
        VALUES (
          ${profile.name},
          ${normEmail},
          ${profile.id},
          ${profile.picture},
          true
        )
        RETURNING id, name, email
      ` as UserIdentity[];
      if (!created) {
        res.redirect(302, `${appUrl}/login?oauth_error=google`);
        return;
      }
      user = created;
    }
  }

  // ── Check onboarding status ───────────────────────────────────────────────
  const [od] = await sql`
    SELECT id FROM onboarding_data WHERE user_id = ${user.id}
  ` as { id: string }[];

  const sessionId = await createSession({
    userId: user.id,
    name:   user.name,
    email:  user.email,
    onboardingComplete: !!od,
  });

  setSessionCookie(res, sessionId, req);
  ensureCsrfToken(req, res);
  res.redirect(302, `${appUrl}/app?oauth=success`);
});

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { createSession, setSessionCookie } from "../lib/session.js";
import { ensureCsrfToken } from "../lib/csrf.js";
import { verifyOAuthState } from "../lib/oauthState.js";
import { withErrorHandling } from "../lib/handler.js";
import type {
  DbUser,
  GithubEmail,
  GithubProfile,
  GithubTokenResponse,
} from "../lib/types.js";

type UserIdentity = Pick<DbUser, "id" | "name" | "email">;

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const appUrl       = process.env["APP_URL"]             ?? "";
  const clientId     = process.env["GITHUB_CLIENT_ID"]    ?? "";
  const clientSecret = process.env["GITHUB_CLIENT_SECRET"] ?? "";

  const code  = req.query["code"]  as string | undefined;
  const error = req.query["error"] as string | undefined;
  const state = req.query["state"] as string | undefined;

  if (error || !code) {
    res.redirect(302, `${appUrl}/?oauth_error=github`);
    return;
  }

  if (!verifyOAuthState(req, res, "github", state)) {
    res.redirect(302, `${appUrl}/?oauth_error=state`);
    return;
  }

  // ── Exchange code for access token ────────────────────────────────────────
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method:  "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body:    JSON.stringify({
      client_id:     clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${appUrl}/api/auth/github-callback`,
    }),
  });

  const { access_token } = (await tokenRes.json()) as GithubTokenResponse;
  if (!access_token) {
    res.redirect(302, `${appUrl}/?oauth_error=github`);
    return;
  }

  const ghHeaders = {
    Authorization: `Bearer ${access_token}`,
    Accept:        "application/json",
  };

  // ── Fetch profile + emails in parallel ────────────────────────────────────
  const [profileRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user",        { headers: ghHeaders }),
    fetch("https://api.github.com/user/emails", { headers: ghHeaders }),
  ]);

  const profile = (await profileRes.json()) as GithubProfile;
  const emails  = (await emailsRes.json())  as GithubEmail[];

  const primaryEmail =
    emails.find((e) => e.primary && e.verified)?.email ??
    emails.find((e) => e.verified)?.email              ??
    profile.email;

  if (!primaryEmail) {
    res.redirect(302, `${appUrl}/?oauth_error=no_email`);
    return;
  }

  const sql         = getDb();
  const githubId    = String(profile.id);
  const normEmail   = primaryEmail.toLowerCase();

  // ── Find or create user ───────────────────────────────────────────────────
  let [user] = await sql`
    SELECT id, name, email FROM users WHERE github_id = ${githubId}
  ` as UserIdentity[];

  if (!user) {
    const [existing] = await sql`
      SELECT id, name, email FROM users WHERE email = ${normEmail}
    ` as UserIdentity[];

    if (existing) {
      await sql`
        UPDATE users
        SET github_id  = ${githubId},
            github_url = ${profile.html_url},
            avatar_url = COALESCE(avatar_url, ${profile.avatar_url})
        WHERE id = ${existing.id}
      `;
      user = existing;
    } else {
      const [created] = await sql`
        INSERT INTO users (name, email, github_id, github_url, avatar_url, is_verified)
        VALUES (
          ${profile.name ?? profile.login},
          ${normEmail},
          ${githubId},
          ${profile.html_url},
          ${profile.avatar_url},
          true
        )
        RETURNING id, name, email
      ` as UserIdentity[];
      if (!created) {
        res.redirect(302, `${appUrl}/?oauth_error=github`);
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
  res.redirect(302, `${appUrl}/?oauth=success`);
});

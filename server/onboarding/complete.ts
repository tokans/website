import { randomBytes } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import {
  requireSession,
  createSession,
  setSessionCookie,
} from "../lib/session.js";
import { getRedis } from "../lib/redis.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import {
  scrapeContactEmail,
  scrapeReadmeEmail,
  parseGithubUrl,
  githubLoginFromProfileUrl,
} from "../lib/scraper.js";
import { sendEmail, verifyEmailHtml, approvalEmailHtml } from "../lib/email.js";
import { slugify } from "../lib/apps.js";
import type { OnboardingCompleteBody } from "../lib/types.js";

const TOKEN_TTL = 60 * 60 * 24; // 24 hours
const APPROVAL_TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

const TRUSTED_PREFIXES = [
  "https://github.com/tokans/",
  "https://tokans.github.io/",
];

async function issueAndSendToken(opts: {
  userId: string;
  websiteUrl: string;
  email: string;
  userName: string | null;
  appUrl: string;
}): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const payload = JSON.stringify({ userId: opts.userId, websiteUrl: opts.websiteUrl, email: opts.email });
  await getRedis().set(`ws_verify:${token}`, payload, { ex: TOKEN_TTL });
  const verifyUrl = `${opts.appUrl}/api/auth/verify-website?token=${token}`;
  // Fire-and-forget so email failure never blocks onboarding completion.
  sendEmail({
    to: opts.email,
    subject: "Confirm your website ownership — Tokans",
    html: verifyEmailHtml({ verifyUrl, websiteUrl: opts.websiteUrl, userName: opts.userName }),
  }).catch((err: unknown) => console.error("[verify-email] send failed:", err));
}

async function upsertAppForBuilder(opts: {
  userId: string;
  websiteUrl: string;
  appUrl: string;
  userName: string | null;
}): Promise<void> {
  const { userId, websiteUrl, appUrl, userName } = opts;
  const sql = getDb();

  const isTrusted = TRUSTED_PREFIXES.some((p) => websiteUrl.startsWith(p));

  let appName: string;
  let appSlug: string;
  let siteUrl: string;

  if (isTrusted) {
    let repo: string | null = null;

    const ghCoords = parseGithubUrl(websiteUrl);
    if (ghCoords?.repo) {
      repo = ghCoords.repo;
      siteUrl = `https://tokans.github.io/${repo}/`;
    } else {
      try {
        const u = new URL(websiteUrl);
        const parts = u.pathname.split("/").filter(Boolean);
        repo = parts[0] ?? null;
        siteUrl = websiteUrl;
      } catch {
        return;
      }
    }

    if (!repo) return;
    appName = repo;
    appSlug = slugify(repo);

    await sql`
      INSERT INTO apps (owner_user_id, slug, name, site_url, listed, support_status)
      VALUES (${userId}, ${appSlug}, ${appName}, ${siteUrl}, TRUE, 'listed')
      ON CONFLICT (slug) DO UPDATE SET
        site_url       = EXCLUDED.site_url,
        owner_user_id  = EXCLUDED.owner_user_id,
        listed         = TRUE,
        support_status = 'listed',
        updated_at     = NOW()
    `;
  } else {
    siteUrl = websiteUrl;

    try {
      const u = new URL(websiteUrl);
      const parts = u.hostname.replace(/^www\./, "").split(".");
      appName = parts[0] ?? "app";
    } catch {
      appName = "app";
    }
    appSlug = slugify(appName + "-" + randomBytes(3).toString("hex"));

    const rows = await sql`
      INSERT INTO apps (owner_user_id, slug, name, site_url, listed, support_status)
      VALUES (${userId}, ${appSlug}, ${appName}, ${siteUrl}, FALSE, 'requested')
      ON CONFLICT (slug) DO UPDATE SET
        site_url       = EXCLUDED.site_url,
        owner_user_id  = EXCLUDED.owner_user_id,
        updated_at     = NOW()
      RETURNING id
    ` as { id: string }[];

    const appId = rows[0]?.id;
    if (!appId) return;

    const approvalToken = randomBytes(32).toString("hex");
    await getRedis().set(`app_approve:${approvalToken}`, JSON.stringify({ appId }), { ex: APPROVAL_TOKEN_TTL });

    const approveUrl = `${appUrl}/api/apps/approve?token=${approvalToken}`;
    const approvalEmail = process.env["APP_APPROVAL_EMAIL"] ?? "tokans.org@gmail.com";

    sendEmail({
      to: approvalEmail,
      subject: "Action Required: app added — Tokans",
      html: approvalEmailHtml({
        approveUrl,
        appName,
        siteUrl,
        submittedBy: userName ?? userId,
      }),
    }).catch((err: unknown) => console.error("[app-approval-email] send failed:", err));
  }
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

  const session = await requireSession(req, res);
  if (!session) return;

  const { role, subType, context, entryPath } = (req.body ?? {}) as OnboardingCompleteBody;

  if (!role) {
    res.status(400).json({ error: "Role is required" });
    return;
  }

  const sql            = getDb();
  const contextJson    = JSON.stringify(context ?? {});
  const subTypeOrNull  = subType ?? null;
  const entryPathOrNull = entryPath ?? null;

  await sql`
    INSERT INTO onboarding_data (user_id, role, sub_type, context)
    VALUES (${session.userId}, ${role}, ${subTypeOrNull}, ${contextJson})
    ON CONFLICT (user_id)
    DO UPDATE SET
      role         = EXCLUDED.role,
      sub_type     = EXCLUDED.sub_type,
      context      = EXCLUDED.context,
      completed_at = NOW()
  `;

  await sql`
    INSERT INTO user_roles (user_id, role, sub_type)
    VALUES (${session.userId}, ${role}, ${subTypeOrNull})
    ON CONFLICT (user_id, role)
    DO UPDATE SET sub_type = EXCLUDED.sub_type
  `;

  if (entryPathOrNull) {
    await sql`
      INSERT INTO user_journeys (user_id, entry_path, role, sub_type, context)
      VALUES (${session.userId}, ${entryPathOrNull}, ${role}, ${subTypeOrNull}, ${contextJson})
      ON CONFLICT (user_id, entry_path)
      DO UPDATE SET
        role         = EXCLUDED.role,
        sub_type     = EXCLUDED.sub_type,
        context      = EXCLUDED.context,
        completed_at = NOW()
    `;
  }

  const journeyRows = await sql`
    SELECT entry_path FROM user_journeys WHERE user_id = ${session.userId}
  `;
  const completedJourneys = journeyRows.map((r) => r["entry_path"] as string);

  // Rotate session.
  await getRedis().del(`session:${session.sessionId}`);
  const newSessionId = await createSession({
    userId:             session.userId,
    name:               session.name,
    email:              session.email,
    onboardingComplete: true,
    role,
    subType:            subTypeOrNull,
    completedJourneys,
  });
  setSessionCookie(res, newSessionId, req);
  ensureCsrfToken(req, res);

  // ── Website verification for idea_stage builders ──────────────────────────
  const websiteUrl = (context?.["websiteUrl"] as string | undefined)?.trim() ?? "";
  const isIdeaStage = role === "builder" && subType === "idea_stage";

  if (!isIdeaStage || !websiteUrl) {
    res.status(200).json({ ok: true });
    return;
  }

  const appUrl = process.env["APP_URL"] ?? "";
  const ghCoords = parseGithubUrl(websiteUrl);

  // ── Path 1: GitHub URL provided ───────────────────────────────────────────
  if (ghCoords) {
    const [dbUser] = await sql`
      SELECT github_url FROM users WHERE id = ${session.userId}
    ` as { github_url: string | null }[];

    const storedGithubLogin = dbUser?.github_url
      ? githubLoginFromProfileUrl(dbUser.github_url)
      : null;

    // 1a. User logged in via GitHub AND the project owner matches their account.
    if (storedGithubLogin && storedGithubLogin === ghCoords.owner) {
      await sql`
        UPDATE users
        SET website_url = ${websiteUrl}, is_verified = true
        WHERE id = ${session.userId}
      `;
      upsertAppForBuilder({ userId: session.userId, websiteUrl, appUrl, userName: session.name })
        .catch((err: unknown) => console.error("[upsert-app] failed:", err));
      res.status(200).json({ ok: true, autoVerified: true, verifiedVia: "github" });
      return;
    }

    // 1b. Try README for an email address (works regardless of OAuth state).
    const readmeEmail = await scrapeReadmeEmail(ghCoords);
    if (readmeEmail) {
      await issueAndSendToken({
        userId: session.userId,
        websiteUrl,
        email: readmeEmail,
        userName: session.name,
        appUrl,
      });
      upsertAppForBuilder({ userId: session.userId, websiteUrl, appUrl, userName: session.name })
        .catch((err: unknown) => console.error("[upsert-app] failed:", err));
      res.status(200).json({ ok: true, verificationSent: true, scrapedEmail: readmeEmail });
      return;
    }

    // 1c. No README email — ask the user to connect GitHub if they haven't already.
    if (!storedGithubLogin) {
      res.status(200).json({ ok: true, verificationSent: false, needsGithubAuth: true });
      return;
    }

    // 1d. Logged in via GitHub but repo owner doesn't match (org repo, fork, etc.)
    res.status(200).json({ ok: true, verificationSent: false, emailDomain: "github.com" });
    return;
  }

  // ── Path 2: Regular website URL ───────────────────────────────────────────
  const { email: scraped, domain, githubCoords: linkedGh } = await scrapeContactEmail(websiteUrl);

  if (scraped) {
    await issueAndSendToken({
      userId: session.userId,
      websiteUrl,
      email: scraped,
      userName: session.name,
      appUrl,
    });
    upsertAppForBuilder({ userId: session.userId, websiteUrl, appUrl, userName: session.name })
      .catch((err: unknown) => console.error("[upsert-app] failed:", err));
    res.status(200).json({ ok: true, verificationSent: true, scrapedEmail: scraped });
    return;
  }

  // No mailto: found — but the site links to a GitHub repo. Reuse the GitHub
  // verification path: README email → or GitHub OAuth if no email found there.
  if (linkedGh) {
    const [dbUser] = await sql`
      SELECT github_url FROM users WHERE id = ${session.userId}
    ` as { github_url: string | null }[];

    const storedGithubLogin = dbUser?.github_url
      ? githubLoginFromProfileUrl(dbUser.github_url)
      : null;

    if (storedGithubLogin && storedGithubLogin === linkedGh.owner) {
      await sql`
        UPDATE users SET website_url = ${websiteUrl}, is_verified = true WHERE id = ${session.userId}
      `;
      upsertAppForBuilder({ userId: session.userId, websiteUrl, appUrl, userName: session.name })
        .catch((err: unknown) => console.error("[upsert-app] failed:", err));
      res.status(200).json({ ok: true, autoVerified: true, verifiedVia: "github" });
      return;
    }

    const readmeEmail = await scrapeReadmeEmail(linkedGh);
    if (readmeEmail) {
      await issueAndSendToken({
        userId: session.userId,
        websiteUrl,
        email: readmeEmail,
        userName: session.name,
        appUrl,
      });
      upsertAppForBuilder({ userId: session.userId, websiteUrl, appUrl, userName: session.name })
        .catch((err: unknown) => console.error("[upsert-app] failed:", err));
      res.status(200).json({ ok: true, verificationSent: true, scrapedEmail: readmeEmail });
      return;
    }

    if (!storedGithubLogin) {
      res.status(200).json({ ok: true, verificationSent: false, needsGithubAuth: true });
      return;
    }
  }

  upsertAppForBuilder({ userId: session.userId, websiteUrl, appUrl, userName: session.name })
    .catch((err: unknown) => console.error("[upsert-app] failed:", err));
  res.status(200).json({ ok: true, verificationSent: false, emailDomain: domain });
});

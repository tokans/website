/**
 * POST /api/onboarding/send-verify
 *
 * Called when the scraper couldn't find a contact email automatically.
 * The user provides an email address; we validate it belongs to the same
 * domain as their websiteUrl, then send the verification link.
 */
import { randomBytes } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { requireSession } from "../lib/session.js";
import { requireJsonContent, verifyCsrf } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import { getRedis } from "../lib/redis.js";
import { sendEmail, verifyEmailHtml } from "../lib/email.js";
import { domainFromUrl } from "../lib/scraper.js";

const TOKEN_TTL = 60 * 60 * 24; // 24 hours

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

  const { email } = (req.body ?? {}) as { email?: string };
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  // Fetch the user's stored websiteUrl from onboarding context.
  const sql = getDb();
  const [od] = await sql`
    SELECT context FROM onboarding_data WHERE user_id = ${session.userId}
  ` as { context: Record<string, unknown> }[];

  const websiteUrl = (od?.context?.["websiteUrl"] as string | undefined) ?? "";
  if (!websiteUrl) {
    res.status(400).json({ error: "No website URL on record for this account" });
    return;
  }

  // Validate: email domain must match website domain.
  const siteDomain = domainFromUrl(websiteUrl);
  const emailDomain = email.split("@")[1]?.toLowerCase().replace(/^www\./, "");
  if (!siteDomain || emailDomain !== siteDomain) {
    res.status(400).json({
      error: `Email must be at @${siteDomain} to match your website domain`,
    });
    return;
  }

  const appUrl = process.env["APP_URL"] ?? "";
  const token = randomBytes(32).toString("hex");
  const payload = JSON.stringify({ userId: session.userId, websiteUrl, email });

  await getRedis().set(`ws_verify:${token}`, payload, { ex: TOKEN_TTL });

  const verifyUrl = `${appUrl}/api/auth/verify-website?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Confirm your website ownership — Tokans",
    html: verifyEmailHtml({ verifyUrl, websiteUrl, userName: session.name }),
  });

  res.status(200).json({ ok: true, email });
});

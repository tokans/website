import { randomBytes } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession } from "../lib/session.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import { getBackend, identityFromSession } from "../lib/backend/index.js";
import { getDb } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { sendEmail, linkedinVerifyEmailHtml } from "../lib/email.js";
import { isKnownProfession, professionToRole } from "../lib/professions.js";
import type { ProfessionalOnboardInput } from "../lib/backend/contract.js";

const TOKEN_TTL = 60 * 60 * 24;

interface OnboardBody {
  profession?: string;
  subType?: string | null;
  answers?: Record<string, unknown>;
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

  const body = (req.body ?? {}) as OnboardBody;
  const profession = (body.profession ?? "").trim();
  if (!profession || !isKnownProfession(profession)) {
    res.status(400).json({ error: "A valid profession is required" });
    return;
  }

  const linkedinUrl = ((body.answers?.["linkedinUrl"] as string | undefined) ?? "").trim();
  if (!linkedinUrl) {
    res.status(400).json({ error: "A LinkedIn profile URL is required" });
    return;
  }

  const { roleName, category } = professionToRole(profession);
  const input: ProfessionalOnboardInput = {
    profession,
    roleName,
    category,
    ...(body.subType != null ? { subType: body.subType } : {}),
    answers: body.answers ?? {},
  };

  const status = await getBackend().onboardProfessional(
    identityFromSession(session),
    input
  );

  // Save LinkedIn URL and issue verification email.
  const sql = getDb();
  await sql`UPDATE users SET linkedin_url = ${linkedinUrl} WHERE id = ${session.userId}`;
  const token = randomBytes(32).toString("hex");
  const appUrl = process.env["APP_URL"] ?? "";
  await getRedis().set(`li_verify:${token}`, { userId: session.userId, linkedinUrl, email: session.email }, { ex: TOKEN_TTL });
  await sendEmail({
    to: session.email,
    subject: "Confirm your LinkedIn profile — Tokans",
    html: linkedinVerifyEmailHtml({
      verifyUrl: `${appUrl}/api/verify/linkedin?token=${token}`,
      linkedinUrl,
      userName: session.name ?? null,
    }),
  });

  ensureCsrfToken(req, res);
  res.status(200).json(status);
});

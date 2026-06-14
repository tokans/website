import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomBytes } from "crypto";
import { getDb } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { sendEmail } from "../lib/email.js";
import { checkRateLimit } from "../lib/ratelimit.js";
import { requireJsonContent, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import { baseUrl } from "../lib/http.js";

const RESET_TTL = 60 * 60; // 1 hour

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!requireJsonContent(req, res)) return;
  if (!(await checkRateLimit(req, res, { bucket: "forgot:ip", windowSec: 3600, max: 5 }))) return;

  const { email } = (req.body ?? {}) as { email?: string };
  if (!email?.includes("@")) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }

  const normEmail = email.toLowerCase().trim();
  const sql = getDb();
  const [user] = await sql`
    SELECT id, name FROM users WHERE email = ${normEmail}
  ` as { id: string; name: string | null }[];

  // Always respond 200 to avoid revealing whether an account exists.
  if (user) {
    const token = randomBytes(32).toString("hex");
    await getRedis().set(`reset:${token}`, { userId: user.id, email: normEmail }, { ex: RESET_TTL });

    const resetUrl = `${baseUrl(req)}/reset-password?token=${token}`;

    await sendEmail({
      to: normEmail,
      subject: "Reset your Tokans password",
      html: resetPasswordEmailHtml({ resetUrl, userName: user.name }),
    });
  }

  ensureCsrfToken(req, res);
  res.status(200).json({ ok: true });
});

function resetPasswordEmailHtml(opts: { resetUrl: string; userName: string | null }): string {
  const name = opts.userName ? `, ${opts.userName.split(" ")[0]}` : "";
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'DM Sans',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
      <tr><td style="background:#1a1a1a;padding:24px 32px">
        <span style="font-family:'Syne',Arial,sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.5px">Tokans</span>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3">Reset your password${name}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6">
          We received a request to reset the password for your Tokans account.
          Click the button below to set a new password — this link expires in 1 hour.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr><td style="background:#1a1a1a;border-radius:8px">
            <a href="${opts.resetUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-.2px">Reset my password →</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5">
          If you didn't request a password reset, you can safely ignore this email. Your password won't change.
        </p>
        <p style="margin:0;font-size:12px;color:#bbb">Or copy this URL into your browser:<br>${opts.resetUrl}</p>
      </td></tr>
      <tr><td style="background:#fafaf8;padding:16px 32px;border-top:1px solid #eee">
        <p style="margin:0;font-size:12px;color:#aaa">Tokans · AI needs Tokens. Humans need Tokans. · <a href="https://tokans.org" style="color:#aaa">tokans.org</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`.trim();
}

/**
 * Thin email sender over the Resend REST API.
 * Requires RESEND_API_KEY. Set up sending domain at resend.com/domains
 * and add the DNS records to tokans.org before using in production.
 */
import "./env.js";

const RESEND_API = "https://api.resend.com/emails";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Tokans <noreply@tokans.org>",
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Email send failed: ${err.message ?? `HTTP ${res.status}`}`);
  }
}

export function verifyEmailHtml(opts: {
  verifyUrl: string;
  websiteUrl: string;
  userName: string | null;
}): string {
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
        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3">Confirm your website ownership${name}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6">
          We received a request to verify that you own <strong>${opts.websiteUrl}</strong> as part of your Tokans Builder profile.
          Click the button below to confirm — your co-founder brief will go live immediately after.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr><td style="background:#1a1a1a;border-radius:8px">
            <a href="${opts.verifyUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-.2px">Confirm my website →</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5">
          This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
        </p>
        <p style="margin:0;font-size:12px;color:#bbb">Or copy this URL into your browser:<br>${opts.verifyUrl}</p>
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

export function approvalEmailHtml(opts: {
  approveUrl: string;
  appName: string;
  siteUrl: string;
  submittedBy: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'DM Sans',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
      <tr><td style="background:#1a1a1a;padding:24px 32px">
        <span style="font-family:'Syne',Arial,sans-serif;font-size:20px;font-weight:800;color:#fff;letter-spacing:-.5px">Tokans Admin</span>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;line-height:1.3">New app pending approval</p>
        <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6">
          A builder has submitted an app for listing in the Tokans directory.<br><br>
          <strong>App name:</strong> ${opts.appName}<br>
          <strong>Site URL:</strong> <a href="${opts.siteUrl}" style="color:#2b6cb0">${opts.siteUrl}</a><br>
          <strong>Submitted by:</strong> ${opts.submittedBy}
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr><td style="background:#1a1a1a;border-radius:8px">
            <a href="${opts.approveUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-.2px">Approve &amp; List App →</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#888;line-height:1.5">
          This approval link expires in 7 days.
        </p>
        <p style="margin:0;font-size:12px;color:#bbb">Or copy this URL into your browser:<br>${opts.approveUrl}</p>
      </td></tr>
      <tr><td style="background:#fafaf8;padding:16px 32px;border-top:1px solid #eee">
        <p style="margin:0;font-size:12px;color:#aaa">Tokans · <a href="https://tokans.org" style="color:#aaa">tokans.org</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`.trim();
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendEmail } from "../lib/email.js";
import { withErrorHandling } from "../lib/handler.js";

const FORWARD_TO = "tokans.org@gmail.com";
const WEBHOOK_SECRET = process.env["INBOUND_WEBHOOK_SECRET"] ?? "";

// Maps the local-part of the recipient address to a readable subject prefix.
// e.g. "site.issues"     → "site issue"
//      "myfinance.issues" → "myfinance issue"
//      "anything.else"    → "anything else"
function subjectPrefix(localPart: string): string {
  return localPart
    .replace(/\./g, " ")     // dots → spaces
    .replace(/issues?$/i, "issue")  // normalise "issues" → "issue"
    .trim();
}

// Resend inbound payload (subset we care about)
interface ResendInbound {
  from:    string;
  to:      string[];
  subject: string;
  html?:   string;
  text?:   string;
  headers?: Record<string, string>;
}

// Resend wraps webhook payloads: { type, created_at, data: ResendInbound }
interface ResendWebhookEnvelope {
  type?: string;
  data?: ResendInbound;
}

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  // Simple shared-secret guard in the query string.
  if (WEBHOOK_SECRET && req.query["secret"] !== WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const raw = req.body as (ResendInbound & ResendWebhookEnvelope) | undefined;
  // Support both flat payload (direct calls) and Resend webhook envelope { type, data }
  const body: ResendInbound | undefined = raw?.data ?? (raw?.from ? raw : undefined);

  if (!body?.from || !body.to?.length) {
    console.error("[inbound] unexpected payload:", JSON.stringify(raw).slice(0, 500));
    res.status(400).json({ error: "Missing from/to" });
    return;
  }

  const originalSubject = body.subject ?? "(no subject)";
  const originalFrom    = body.from;

  // Find the first recipient that is an @tokans.org address.
  const recipient = body.to.find((a) => a.toLowerCase().includes("@tokans.org"));
  const localPart = recipient
    ? (recipient.split("@")[0] ?? "").toLowerCase()
    : "unknown";

  const prefix  = subjectPrefix(localPart);
  const subject = `${prefix}: ${originalSubject}`;

  // Build the forwarded body — include original sender info.
  const htmlBody = `
    <p style="color:#888;font-size:12px;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:16px">
      <strong>From:</strong> ${originalFrom}<br>
      <strong>To:</strong> ${recipient ?? body.to.join(", ")}<br>
      <strong>Original subject:</strong> ${originalSubject}
    </p>
    ${body.html ?? `<pre>${body.text ?? ""}</pre>`}
  `;

  await sendEmail({ to: FORWARD_TO, subject, html: htmlBody });

  res.status(200).json({ ok: true });
});

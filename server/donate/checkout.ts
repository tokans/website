import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { getSession, getSessionId } from "../lib/session.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import { baseUrl } from "../lib/http.js";
import { getPayments } from "../lib/payments/index.js";

const MIN_DONATION_MINOR = 5000; // ₹50

interface DonateBody {
  amountMinor?: number;
  currency?: string;
  email?: string | null;
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

  const body = (req.body ?? {}) as DonateBody;
  const amountMinor = Number(body.amountMinor);
  if (!Number.isInteger(amountMinor) || amountMinor < MIN_DONATION_MINOR) {
    res.status(400).json({
      error: `Minimum donation is ${MIN_DONATION_MINOR / 100} (minor units ${MIN_DONATION_MINOR})`,
    });
    return;
  }
  const currency = (body.currency ?? "INR").toUpperCase();

  // Donations are anonymous-friendly; associate a user only if already signed in.
  const session = await getSession(getSessionId(req));
  const email = body.email ?? session?.email ?? null;
  const userId = session?.userId ?? null;

  const base = baseUrl(req);
  const result = await getPayments().createDonationCheckout({
    amountMinor,
    currency,
    email,
    successUrl: `${base}/donate?status=success`,
    cancelUrl: `${base}/donate?status=cancel`,
  });

  const sql = getDb();
  await sql`
    INSERT INTO donations (user_id, email, amount_minor, currency, status, provider, provider_ref)
    VALUES (${userId}, ${email}, ${amountMinor}, ${currency},
            ${result.settledImmediately ? "completed" : "pending"},
            ${result.provider}, ${result.ref})
  `;

  ensureCsrfToken(req, res);
  res.status(200).json({ url: result.url });
});

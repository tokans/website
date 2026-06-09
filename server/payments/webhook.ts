import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { withErrorHandling } from "../lib/handler.js";
import { readRawBody } from "../lib/http.js";
import { getPayments } from "../lib/payments/index.js";

/**
 * Gateway webhook (Stripe). Verifies + normalises the event, then settles the
 * matching donation/subscription. No-op in mock mode (checkout settles instantly).
 * NOTE: reliable Stripe signature verification needs the RAW body — see
 * docs/payments-setup.md (Vercel raw-body TODO).
 */
export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sigHeader = req.headers["stripe-signature"];
  const signature = Array.isArray(sigHeader) ? sigHeader[0] ?? null : sigHeader ?? null;
  const raw = await readRawBody(req);

  let event;
  try {
    event = await getPayments().parseWebhook(raw, signature);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid webhook" });
    return;
  }

  const sql = getDb();
  switch (event.kind) {
    case "donation.completed":
      await sql`UPDATE donations SET status = 'completed', updated_at = NOW() WHERE provider_ref = ${event.ref}`;
      break;
    case "subscription.activated":
      if (event.userId) {
        await sql`
          UPDATE subscriptions SET status = 'active', updated_at = NOW()
          WHERE user_id = ${event.userId}
        `;
      } else {
        await sql`UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE provider_ref = ${event.ref}`;
      }
      break;
    case "subscription.canceled":
      await sql`UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE provider_ref = ${event.ref}`;
      break;
    case "ignored":
      break;
  }

  res.status(200).json({ received: true });
});

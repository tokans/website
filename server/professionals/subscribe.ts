import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { requireSession } from "../lib/session.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import { baseUrl } from "../lib/http.js";
import { getPayments } from "../lib/payments/index.js";
import { DEFAULT_PLAN_ID, getPlan, isKnownPlan } from "../lib/plans.js";

interface SubscribeBody {
  plan?: string;
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

  const body = (req.body ?? {}) as SubscribeBody;
  const planId = body.plan ?? DEFAULT_PLAN_ID;
  if (!isKnownPlan(planId)) {
    res.status(400).json({ error: "Unknown plan" });
    return;
  }
  const plan = getPlan(planId);
  if (!plan) {
    res.status(400).json({ error: "Unknown plan" });
    return;
  }

  const base = baseUrl(req);
  const result = await getPayments().createSubscriptionCheckout({
    userId: session.userId,
    email: session.email,
    plan,
    successUrl: `${base}/professionals/subscribe?status=success`,
    cancelUrl: `${base}/professionals/subscribe?status=cancel`,
  });

  const sql = getDb();
  const status = result.settledImmediately ? "active" : "incomplete";
  await sql`
    INSERT INTO subscriptions (user_id, plan, status, provider, provider_ref, current_period_end)
    VALUES (${session.userId}, ${plan.id}, ${status}, ${result.provider}, ${result.ref}, NULL)
    ON CONFLICT (user_id) DO UPDATE SET
      plan         = EXCLUDED.plan,
      status       = EXCLUDED.status,
      provider     = EXCLUDED.provider,
      provider_ref = EXCLUDED.provider_ref,
      updated_at   = NOW()
  `;

  ensureCsrfToken(req, res);
  res.status(200).json({ url: result.url });
});

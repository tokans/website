import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { requireSession } from "../lib/session.js";
import { withErrorHandling } from "../lib/handler.js";

interface SubRow {
  plan: string;
  status: string;
  current_period_end: string | null;
}

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = await requireSession(req, res);
  if (!session) return;

  const sql = getDb();
  const rows = (await sql`
    SELECT plan, status, current_period_end
    FROM subscriptions
    WHERE user_id = ${session.userId}
    LIMIT 1
  `) as SubRow[];

  const row = rows[0];
  res.status(200).json({
    active: row?.status === "active",
    plan: row?.plan ?? null,
    status: row?.status ?? "none",
    currentPeriodEnd: row?.current_period_end ?? null,
  });
});

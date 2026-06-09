import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/handler.js";
import { rebuildSnapshots } from "../lib/snapshot.js";

/**
 * Daily job: rebuild the public directory JSON snapshots (apps, partners) into
 * Redis so the pre-login pages serve from cache instead of hammering the DB.
 *
 * Scheduled by the `crons` entry in vercel.json. Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is configured; we
 * enforce it when present so the endpoint can't be triggered by the public.
 */
export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const secret = process.env["CRON_SECRET"];
  if (secret) {
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const result = await rebuildSnapshots();
  res.status(200).json({ ok: true, ...result });
});

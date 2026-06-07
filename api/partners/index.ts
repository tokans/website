import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { withErrorHandling } from "../lib/handler.js";
import { type PartnerRow, mapPartnerRow } from "../lib/partners.js";

/** Public partner directory (the listings other suite apps also surface as ads). */
export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sql = getDb();
  const rows = (await sql`
    SELECT pl.id, pl.professional_user_id, u.name, pl.headline, pl.profession,
           pl.skills, pl.role_category
    FROM partner_listings pl
    JOIN users u ON u.id = pl.professional_user_id
    WHERE pl.visible = TRUE
    ORDER BY pl.created_at DESC
    LIMIT 200
  `) as PartnerRow[];

  res.status(200).json({ partners: rows.map(mapPartnerRow) });
});

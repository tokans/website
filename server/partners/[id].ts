import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { withErrorHandling } from "../lib/handler.js";
import { type PartnerRow, mapPartnerRow } from "../lib/partners.js";

/** Public partner profile page (the destination an ad links to). */
export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const idParam = req.query["id"];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    res.status(400).json({ error: "Listing id is required" });
    return;
  }

  const sql = getDb();
  const rows = (await sql`
    SELECT pl.id, pl.professional_user_id, u.name, pl.headline, pl.profession,
           pl.skills, pl.role_category
    FROM partner_listings pl
    JOIN users u ON u.id = pl.professional_user_id
    WHERE pl.id = ${id} AND pl.visible = TRUE
    LIMIT 1
  `) as PartnerRow[];

  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "Partner not found" });
    return;
  }
  res.status(200).json(mapPartnerRow(row));
});

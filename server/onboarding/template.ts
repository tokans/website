import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { withErrorHandling } from "../lib/handler.js";

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const val = req.query["val"];
  if (!val || typeof val !== "string") {
    res.status(400).json({ error: "val is required" });
    return;
  }

  const sql = getDb();
  const rows = await sql`
    SELECT id, name, role, sub_type, context
    FROM onboarding_templates
    WHERE val_hash = ${val}
    LIMIT 1
  ` as { id: string; name: string; role: string; sub_type: string | null; context: Record<string, unknown> }[];

  if (!rows[0]) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  const t = rows[0];
  res.status(200).json({
    id:      t.id,
    name:    t.name,
    role:    t.role,
    subType: t.sub_type,
    context: t.context,
  });
});

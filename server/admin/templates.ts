import { randomBytes } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { requireSession } from "../lib/session.js";
import { requireJsonContent, verifyCsrf } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import { isAdmin } from "../lib/admin.js";

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const session = await requireSession(req, res);
  if (!session) return;

  if (!isAdmin(session.email)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const sql = getDb();

  if (req.method === "GET") {
    const rows = await sql`
      SELECT id, name, val_hash, role, sub_type, context, created_at
      FROM onboarding_templates
      ORDER BY created_at DESC
    ` as {
      id: string;
      name: string;
      val_hash: string;
      role: string;
      sub_type: string | null;
      context: Record<string, unknown>;
      created_at: string;
    }[];

    res.status(200).json({ templates: rows });
    return;
  }

  if (req.method === "POST") {
    if (!requireJsonContent(req, res)) return;
    if (!verifyCsrf(req, res)) return;

    const { name, role, subType, context } = (req.body ?? {}) as {
      name?: string;
      role?: string;
      subType?: string | null;
      context?: Record<string, unknown>;
    };

    if (!name?.trim() || !role?.trim()) {
      res.status(400).json({ error: "name and role are required" });
      return;
    }

    const valHash = randomBytes(16).toString("hex");
    const contextJson = JSON.stringify(context ?? {});

    const rows = await sql`
      INSERT INTO onboarding_templates (name, val_hash, role, sub_type, context, created_by)
      VALUES (${name.trim()}, ${valHash}, ${role}, ${subType ?? null}, ${contextJson}::jsonb, ${session.userId})
      RETURNING id, val_hash
    ` as { id: string; val_hash: string }[];

    res.status(201).json({ id: rows[0]!.id, valHash: rows[0]!.val_hash });
    return;
  }

  if (req.method === "DELETE") {
    const id = req.query["id"];
    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "id is required" });
      return;
    }
    await sql`DELETE FROM onboarding_templates WHERE id = ${id}`;
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

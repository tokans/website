import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { requireSession } from "../lib/session.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";
import { SEED_PROFILES, getSeedProfile } from "../lib/seedProfiles.js";

interface TaskAnswers {
  strongestSkill?: string;
  unverifiableClaim?: string;
  wouldWorkWith?: string;
  missing?: string;
  confidence?: "low" | "medium" | "high";
}

export default withErrorHandling(async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const session = await requireSession(req, res);
  if (!session) return;
  const sql = getDb();

  // ── Next seed profile to review ─────────────────────────────────────────────
  if (req.method === "GET") {
    const reviewed = (await sql`
      SELECT seed_profile_id FROM tokan_task_submissions WHERE reviewer_id = ${session.userId}
    `) as { seed_profile_id: string }[];
    const done = new Set(reviewed.map((r) => r.seed_profile_id));
    const profile = SEED_PROFILES.find((p) => !done.has(p.id)) ?? null;
    res.status(200).json({ profile, remaining: SEED_PROFILES.length - done.size });
    return;
  }

  // ── Submit a review → award the first Tokan ─────────────────────────────────
  if (req.method === "POST") {
    if (!requireJsonContent(req, res)) return;
    if (!verifyCsrf(req, res)) return;

    const body = (req.body ?? {}) as { seedProfileId?: string; answers?: TaskAnswers };
    const seedProfileId = (body.seedProfileId ?? "").trim();
    const answers = body.answers ?? {};
    if (!getSeedProfile(seedProfileId)) {
      res.status(400).json({ error: "Unknown seed profile" });
      return;
    }
    if (!answers.strongestSkill?.trim() || !answers.confidence) {
      res.status(400).json({ error: "Please answer the required questions" });
      return;
    }

    // Idempotent: one submission per (reviewer, profile).
    const inserted = (await sql`
      INSERT INTO tokan_task_submissions (reviewer_id, seed_profile_id, answers)
      VALUES (${session.userId}, ${seedProfileId}, ${JSON.stringify(answers)}::jsonb)
      ON CONFLICT (reviewer_id, seed_profile_id) DO NOTHING
      RETURNING id
    `) as { id: string }[];

    let tokanAwarded = false;
    if (inserted[0]) {
      // Award the first Tokan via the existing scoring tables (self-verified, low impact).
      const act = (await sql`
        INSERT INTO activities (user_id, type, verification_level, impact_level)
        VALUES (${session.userId}, 'peer_review_completed', 'self', 'low')
        RETURNING id
      `) as { id: string }[];
      const activityId = act[0]?.id ?? null;
      await sql`
        INSERT INTO tokan_entries
          (user_id, activity_id, tokan_type, base_value, verification_multiplier, impact_multiplier, confidence_factor)
        VALUES (${session.userId}, ${activityId}, 'impact', 10, 0.3, 0.8, 0.6)
      `;
      tokanAwarded = true;
    }

    const reviewedCount = (await sql`
      SELECT COUNT(*)::int AS n FROM tokan_task_submissions WHERE reviewer_id = ${session.userId}
    `) as { n: number }[];
    const remaining = SEED_PROFILES.length - (reviewedCount[0]?.n ?? 0);

    ensureCsrfToken(req, res);
    res.status(200).json({ ok: true, tokanAwarded, remaining });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

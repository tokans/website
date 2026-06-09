import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { requireSession } from "../lib/session.js";
import { requireJsonContent, verifyCsrf, ensureCsrfToken } from "../lib/csrf.js";
import { withErrorHandling } from "../lib/handler.js";

interface BriefBody {
  whatTheyOwn?: string;
  successAt60Days?: string;
  technicalBottleneck?: string;
  pastHiringAttempts?: string;
  technicalSetup?: string;
  engagementType?: string;
  budgetRange?: string;
}

/**
 * Persist the employer 7-question brief (called on /hire onboarding completion).
 * Questions 5–7 (tech setup, engagement, budget) may arrive later from the
 * dashboard, so they're optional here; status starts 'draft'.
 */
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

  const b = (req.body ?? {}) as BriefBody;
  const sql = getDb();
  const rows = (await sql`
    INSERT INTO employer_briefs
      (employer_id, what_they_own, success_at_60_days, technical_bottleneck,
       past_hiring_attempts, technical_setup, engagement_type, budget_range, status)
    VALUES
      (${session.userId}, ${b.whatTheyOwn ?? null}, ${b.successAt60Days ?? null},
       ${b.technicalBottleneck ?? null}, ${b.pastHiringAttempts ?? null},
       ${b.technicalSetup ?? null}, ${b.engagementType ?? null}, ${b.budgetRange ?? null}, 'draft')
    RETURNING id
  `) as { id: string }[];

  ensureCsrfToken(req, res);
  res.status(201).json({ briefId: rows[0]?.id ?? null });
});

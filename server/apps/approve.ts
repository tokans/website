import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { getRedis } from "../lib/redis.js";
import { withErrorHandling } from "../lib/handler.js";

export default withErrorHandling(async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const tokenParam = req.query["token"];
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  const redis = getRedis();
  const raw = await redis.get<string>(`app_approve:${token}`);
  if (!raw) {
    res.status(404).json({ error: "Token not found or expired" });
    return;
  }

  let appId: string;
  try {
    const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
    appId = payload.appId as string;
  } catch {
    res.status(400).json({ error: "Invalid token payload" });
    return;
  }

  if (!appId) {
    res.status(400).json({ error: "Invalid token payload" });
    return;
  }

  const sql = getDb();
  await sql`
    UPDATE apps SET listed = TRUE, support_status = 'listed', updated_at = NOW()
    WHERE id = ${appId}
  `;

  await redis.del(`app_approve:${token}`);

  res.writeHead(302, { Location: "/apps" });
  res.end();
});

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDb } from "../lib/db.js";
import { readAppsSnapshot } from "../lib/snapshot.js";
import { withErrorHandling } from "../lib/handler.js";

const PRIVATE_HOST_RE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|0\.0\.0\.0)/i;

export default withErrorHandling(async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const slug = String(req.query["slug"] ?? "");
  const tail = String(req.query["path"] ?? "");

  // Resolve app from snapshot first, DB fallback
  let siteUrl: string | null = null;
  const snapshot = await readAppsSnapshot().catch(() => null);
  if (snapshot) {
    const app = snapshot.apps.find((a) => a.slug === slug && a.listed);
    siteUrl = app?.siteUrl ?? null;
  }
  if (!siteUrl) {
    const sql = getDb();
    const [row] = await sql`SELECT site_url FROM apps WHERE slug = ${slug} AND listed = TRUE` as { site_url: string | null }[];
    siteUrl = row?.site_url ?? null;
  }

  if (!siteUrl) { res.status(404).json({ error: "App not found" }); return; }

  // SSRF guard: https only, no private hosts
  let target: URL;
  try { target = new URL(siteUrl); } catch { res.status(502).json({ error: "Invalid site_url" }); return; }
  if (target.protocol !== "https:") { res.status(502).json({ error: "Non-https target" }); return; }
  if (PRIVATE_HOST_RE.test(target.hostname)) { res.status(502).json({ error: "Private host blocked" }); return; }

  // Build target URL
  const base = siteUrl.endsWith("/") ? siteUrl : siteUrl + "/";
  const fullUrl = tail ? new URL(tail, base).href : base;

  // Forward conditional/range headers
  const fwdHeaders: Record<string, string> = {
    "User-Agent": "Tokans/1.0 (app-proxy; +https://tokans.org)",
  };
  for (const h of ["range", "if-none-match", "if-modified-since"] as const) {
    const v = req.headers[h];
    if (v) fwdHeaders[h] = Array.isArray(v) ? v[0]! : v;
  }

  const upstream = await fetch(fullUrl, {
    headers: fwdHeaders,
    signal: AbortSignal.timeout(9000),
    redirect: "follow",
  });

  // Copy relevant response headers
  for (const h of ["content-type", "content-length", "accept-ranges", "content-range", "etag", "cache-control"]) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }

  res.status(upstream.status);
  res.end(Buffer.from(await upstream.arrayBuffer()));
});

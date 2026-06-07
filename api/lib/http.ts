import type { VercelRequest } from "@vercel/node";

/** Absolute origin of the deployment, for building success/cancel redirect URLs. */
export function baseUrl(req: VercelRequest): string {
  const env = process.env["PUBLIC_BASE_URL"];
  if (env) return env.replace(/\/+$/, "");
  const protoH = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(protoH) ? protoH[0] : protoH) ?? "https";
  const host = req.headers["host"] ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Read the raw request body (needed for Stripe webhook signature verification).
 * NOTE: @vercel/node parses JSON bodies eagerly, so the stringified fallback may
 * not byte-match the original payload — see docs/payments-setup.md (raw-body TODO).
 * Not exercised in mock mode.
 */
export async function readRawBody(req: VercelRequest): Promise<string> {
  const b = (req as unknown as { body?: unknown }).body;
  if (typeof b === "string") return b;
  if (Buffer.isBuffer(b)) return b.toString("utf8");
  if (b && typeof b === "object") return JSON.stringify(b);
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

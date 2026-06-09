import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Decide whether to set the Secure flag.
 * We disable it whenever the request comes in over plain HTTP (e.g. local dev)
 * because browsers (notably Firefox) refuse Secure cookies on insecure origins.
 *
 * Detection order:
 *   1. x-forwarded-proto header (set by Vercel's edge / reverse proxies)
 *   2. host header — localhost / 127.0.0.1 / *.local always treated as insecure
 *   3. APP_URL env — fallback when no request is available
 *   4. VERCEL_ENV=development — final fallback
 */
export function isSecureRequest(req?: VercelRequest): boolean {
  if (req) {
    const proto = req.headers["x-forwarded-proto"];
    const protoVal = Array.isArray(proto) ? proto[0] : proto;
    if (protoVal) return protoVal.toLowerCase() === "https";

    const host = (req.headers["host"] ?? "").toString().toLowerCase();
    if (
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.endsWith(".local")
    ) {
      return false;
    }
    // No proto header, non-local host — assume https.
    return true;
  }

  if (process.env["VERCEL_ENV"] === "development") return false;
  if (process.env["NODE_ENV"] === "development") return false;
  const appUrl = process.env["APP_URL"] ?? "";
  if (appUrl.startsWith("http://")) return false;
  return true;
}

export function parseCookies(req: VercelRequest): Record<string, string> {
  const raw = (req.headers["cookie"] as string | undefined) ?? "";
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

/**
 * Append-safe Set-Cookie (multiple cookies on one response).
 */
export function appendSetCookie(res: VercelResponse, value: string): void {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", value);
  } else if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, value]);
  } else {
    res.setHeader("Set-Cookie", [String(existing), value]);
  }
}

interface CookieAttrs {
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  /** Pass the request to derive Secure from the actual scheme/host. */
  req?: VercelRequest;
}

export function buildCookie(name: string, value: string, attrs: CookieAttrs = {}): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${attrs.path ?? "/"}`,
    `SameSite=${attrs.sameSite ?? "Lax"}`,
  ];
  if (attrs.httpOnly !== false) parts.push("HttpOnly");
  if (isSecureRequest(attrs.req)) parts.push("Secure");
  if (typeof attrs.maxAge === "number") parts.push(`Max-Age=${attrs.maxAge}`);
  return parts.join("; ");
}

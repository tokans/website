import { randomBytes, timingSafeEqual } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { appendSetCookie, buildCookie, parseCookies } from "./cookies.js";

export const CSRF_COOKIE = "tokans_csrf";
export const CSRF_HEADER = "x-csrf-token";
const CSRF_TTL = 60 * 60 * 24 * 7; // 7 days

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function getCsrfCookie(req: VercelRequest): string | null {
  return parseCookies(req)[CSRF_COOKIE] ?? null;
}

export function setCsrfCookie(
  res: VercelResponse,
  token: string,
  req?: VercelRequest
): void {
  // Non-HttpOnly so the SPA can read it and echo it back as a header.
  appendSetCookie(
    res,
    buildCookie(CSRF_COOKIE, token, {
      httpOnly: false,
      maxAge: CSRF_TTL,
      ...(req ? { req } : {}),
    })
  );
}

/**
 * Ensure a CSRF token exists; mint one if missing. Returns the token.
 */
export function ensureCsrfToken(req: VercelRequest, res: VercelResponse): string {
  const existing = getCsrfCookie(req);
  if (existing) return existing;
  const token = generateToken();
  setCsrfCookie(res, token, req);
  return token;
}

/**
 * Verify double-submit CSRF on a mutating request.
 * Returns true if valid; sends 403 and returns false otherwise.
 */
export function verifyCsrf(req: VercelRequest, res: VercelResponse): boolean {
  // Only enforce on state-changing methods.
  const method = (req.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;

  const cookieToken = getCsrfCookie(req);
  const headerVal = req.headers[CSRF_HEADER];
  const headerToken = Array.isArray(headerVal) ? headerVal[0] : headerVal;

  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    res.status(403).json({ error: "CSRF validation failed" });
    return false;
  }

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(403).json({ error: "CSRF validation failed" });
    return false;
  }
  return true;
}

/**
 * Reject non-JSON POST bodies. Combined with SameSite=Lax this blocks
 * naive form-based CSRF (forms can't send application/json).
 */
export function requireJsonContent(req: VercelRequest, res: VercelResponse): boolean {
  const ct = req.headers["content-type"];
  const value = Array.isArray(ct) ? ct[0] : ct;
  if (!value || !value.toLowerCase().includes("application/json")) {
    res.status(415).json({ error: "Content-Type must be application/json" });
    return false;
  }
  return true;
}

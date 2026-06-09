import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { SessionPayload, SessionWithId } from "./types.js";
import { getRedis } from "./redis.js";
import { appendSetCookie, buildCookie, parseCookies } from "./cookies.js";

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const COOKIE_NAME = "tokans_session";

// ── Create a new session in Redis ─────────────────────────────────────────────
export async function createSession(payload: SessionPayload): Promise<string> {
  const sessionId = randomUUID();
  await getRedis().set(`session:${sessionId}`, payload, { ex: SESSION_TTL });
  return sessionId;
}

// ── Read session payload from Redis ───────────────────────────────────────────
export async function getSession(
  sessionId: string | null
): Promise<SessionPayload | null> {
  if (!sessionId) return null;
  return await getRedis().get<SessionPayload>(`session:${sessionId}`);
}

// ── Delete session (logout) ───────────────────────────────────────────────────
export async function deleteSession(sessionId: string | null): Promise<void> {
  if (sessionId) await getRedis().del(`session:${sessionId}`);
}

// ── Parse session ID from incoming request cookies ────────────────────────────
export function getSessionId(req: VercelRequest): string | null {
  return parseCookies(req)[COOKIE_NAME] ?? null;
}

// ── Attach Set-Cookie header (login) ──────────────────────────────────────────
export function setSessionCookie(
  res: VercelResponse,
  sessionId: string,
  req?: VercelRequest
): void {
  appendSetCookie(
    res,
    buildCookie(COOKIE_NAME, sessionId, {
      maxAge: SESSION_TTL,
      httpOnly: true,
      ...(req ? { req } : {}),
    })
  );
}

// ── Clear cookie (logout) ─────────────────────────────────────────────────────
export function clearSessionCookie(res: VercelResponse, req?: VercelRequest): void {
  appendSetCookie(
    res,
    buildCookie(COOKIE_NAME, "", {
      maxAge: 0,
      httpOnly: true,
      ...(req ? { req } : {}),
    })
  );
}

// ── Middleware-style: require auth or return 401 ──────────────────────────────
export async function requireSession(
  req: VercelRequest,
  res: VercelResponse
): Promise<SessionWithId | null> {
  const sid = getSessionId(req);
  const session = await getSession(sid);
  if (!session) {
    res.status(401).json({ error: "Unauthorised" });
    return null;
  }
  return { sessionId: sid as string, ...session };
}

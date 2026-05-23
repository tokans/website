// import { kv } from "@vercel/kv";
import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { SessionPayload, SessionWithId } from "./types.js";
import { Redis } from '@upstash/redis';
// import { NextResponse } from 'next/server';

// Initialize Redis
const kv = Redis.fromEnv();

// export const POST = async () => {
//   // Fetch data from Redis
//   const result = await kv.get("item");
  
//   // Return the result in the response
//   return new NextResponse(JSON.stringify({ result }), { status: 200 });
// };

const SESSION_TTL  = 60 * 60 * 24 * 7; // 7 days in seconds
const COOKIE_NAME  = "tokans_session";

// ── Create a new session in Redis ─────────────────────────────────────────────
export async function createSession(payload: SessionPayload): Promise<string> {
  const sessionId = randomUUID();
  await kv.set(`session:${sessionId}`, payload, { ex: SESSION_TTL });
  return sessionId;
}

// ── Read session payload from Redis ───────────────────────────────────────────
export async function getSession(
  sessionId: string | null
): Promise<SessionPayload | null> {
  if (!sessionId) return null;
  return await kv.get<SessionPayload>(`session:${sessionId}`);
}

// ── Delete session (logout) ───────────────────────────────────────────────────
export async function deleteSession(sessionId: string | null): Promise<void> {
  if (sessionId) await kv.del(`session:${sessionId}`);
}

// ── Parse session ID from incoming request cookies ────────────────────────────
export function getSessionId(req: VercelRequest): string | null {
  const raw   = (req.headers["cookie"] as string | undefined) ?? "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

// ── Attach Set-Cookie header (login) ──────────────────────────────────────────
export function setSessionCookie(res: VercelResponse, sessionId: string): void {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`
  );
}

// ── Clear cookie (logout) ─────────────────────────────────────────────────────
export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

// ── Middleware-style: require auth or return 401 ──────────────────────────────
export async function requireSession(
  req: VercelRequest,
  res: VercelResponse
): Promise<SessionWithId | null> {
  const sid     = getSessionId(req);
  const session = await getSession(sid);
  if (!session) {
    res.status(401).json({ error: "Unauthorised" });
    return null;
  }
  return { sessionId: sid as string, ...session };
}

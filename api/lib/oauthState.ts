import { randomBytes, timingSafeEqual } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { appendSetCookie, buildCookie, parseCookies } from "./cookies.js";

const STATE_TTL = 60 * 10; // 10 minutes — long enough for OAuth round-trip
const STATE_COOKIE_PREFIX = "tokans_oauth_state_";

function cookieName(provider: string): string {
  return `${STATE_COOKIE_PREFIX}${provider}`;
}

export function issueOAuthState(
  req: VercelRequest,
  res: VercelResponse,
  provider: "github" | "google"
): string {
  const state = randomBytes(24).toString("hex");
  appendSetCookie(
    res,
    buildCookie(cookieName(provider), state, {
      maxAge: STATE_TTL,
      httpOnly: true,
      sameSite: "Lax",
      req,
    })
  );
  return state;
}

/**
 * Verify the OAuth state from the callback matches the one we issued.
 * Always clears the state cookie afterwards.
 */
export function verifyOAuthState(
  req: VercelRequest,
  res: VercelResponse,
  provider: "github" | "google",
  receivedState: string | undefined
): boolean {
  const expected = parseCookies(req)[cookieName(provider)];
  // Always clear the state cookie regardless of outcome.
  appendSetCookie(
    res,
    buildCookie(cookieName(provider), "", { maxAge: 0, httpOnly: true, req })
  );

  if (!expected || !receivedState || expected.length !== receivedState.length) {
    return false;
  }
  const a = Buffer.from(expected);
  const b = Buffer.from(receivedState);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

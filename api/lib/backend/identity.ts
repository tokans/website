/**
 * Identity-forward token (P0).
 *
 * The website edge authenticates the user (Redis session) and must forward a
 * verifiable identity to the gRPC backend (`tokans/backend`). gRPC metadata will
 * carry a short-lived HMAC-signed token minted here. The mock backend can verify
 * it too, so the seam behaves the same whether the adapter is `mock` or `grpc`.
 *
 * This is NOT the user's auth credential — it is a 2-minute assertion of "the
 * edge says this is user X with roles Y", signed with a secret shared only
 * between the edge and the backend. Replaced 1:1 by the real BE contract later.
 */
import { createHmac, timingSafeEqual } from "crypto";
import "../env.js";
import type { SessionWithId } from "../types.js";

const DEFAULT_TTL_SEC = 120; // short-lived assertion

export interface Identity {
  userId: string;
  email: string;
  name: string | null;
  roles: string[];
}

interface TokenClaims extends Identity {
  iat: number;
  exp: number;
}

function secret(): string {
  const s = process.env["BACKEND_IDENTITY_SECRET"];
  if (s) return s;
  const env = process.env["VERCEL_ENV"];
  if (env && env !== "development") {
    throw new Error("BACKEND_IDENTITY_SECRET must be set outside local development");
  }
  // Dev-only fallback so `vercel dev` works without extra setup.
  return "dev-insecure-identity-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Build an Identity from an authenticated edge session. */
export function identityFromSession(session: SessionWithId): Identity {
  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    roles: session.role ? [session.role] : [],
  };
}

/** Mint a short-lived signed identity token (carried as gRPC metadata). */
export function mintIdentityToken(
  identity: Identity,
  ttlSec: number = DEFAULT_TTL_SEC,
  nowSec: number = Math.floor(Date.now() / 1000)
): string {
  const claims: TokenClaims = { ...identity, iat: nowSec, exp: nowSec + ttlSec };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Verify a token minted by {@link mintIdentityToken}; throws if invalid/expired. */
export function verifyIdentityToken(
  token: string,
  nowSec: number = Math.floor(Date.now() / 1000)
): Identity {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("malformed identity token");
  const payload = parts[0] as string;
  const providedSig = parts[1] as string;

  const expectedSig = sign(payload);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("bad identity token signature");
  }

  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString()
  ) as TokenClaims;
  if (claims.exp < nowSec) throw new Error("identity token expired");

  return {
    userId: claims.userId,
    email: claims.email,
    name: claims.name,
    roles: claims.roles,
  };
}

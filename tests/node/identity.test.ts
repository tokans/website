import { describe, it, expect } from "vitest";
import {
  mintIdentityToken,
  verifyIdentityToken,
  identityFromSession,
  type Identity,
} from "../../api/lib/backend/identity.js";
import type { SessionWithId } from "../../api/lib/types.js";

const IDENTITY: Identity = {
  userId: "u_123",
  email: "pro@example.com",
  name: "Ada Pro",
  roles: ["partner"],
};

describe("identity token", () => {
  it("mints a token that round-trips through verify", () => {
    const token = mintIdentityToken(IDENTITY);
    expect(token.split(".")).toHaveLength(2);
    const out = verifyIdentityToken(token);
    expect(out).toEqual(IDENTITY);
  });

  it("rejects a tampered payload", () => {
    const token = mintIdentityToken(IDENTITY);
    const [, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...IDENTITY, userId: "attacker", iat: 0, exp: 9e9 })
    ).toString("base64url");
    expect(() => verifyIdentityToken(`${forged}.${sig}`)).toThrow(/signature/);
  });

  it("rejects a malformed token", () => {
    expect(() => verifyIdentityToken("not-a-token")).toThrow(/malformed/);
  });

  it("rejects an expired token", () => {
    const nowSec = 1_000_000;
    const token = mintIdentityToken(IDENTITY, 60, nowSec);
    // verify 61s later → expired
    expect(() => verifyIdentityToken(token, nowSec + 61)).toThrow(/expired/);
    // still valid before expiry
    expect(verifyIdentityToken(token, nowSec + 59).userId).toBe("u_123");
  });

  it("derives an Identity from a session (role array)", () => {
    const session = {
      sessionId: "s1",
      userId: "u_9",
      email: "x@y.z",
      name: null,
      onboardingComplete: true,
      role: "employer",
    } as SessionWithId;
    expect(identityFromSession(session)).toEqual({
      userId: "u_9",
      email: "x@y.z",
      name: null,
      roles: ["employer"],
    });
  });

  it("yields an empty roles array when the session has no role", () => {
    const session = {
      sessionId: "s2",
      userId: "u_10",
      email: "a@b.c",
      name: "No Role",
      onboardingComplete: false,
    } as SessionWithId;
    expect(identityFromSession(session).roles).toEqual([]);
  });
});

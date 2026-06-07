import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockReq, mockRes } from "./helpers.js";
import type { SessionWithId } from "../../api/lib/types.js";

// ── Mock the endpoint's collaborators so we test the wiring/validation only ──
const h = vi.hoisted(() => ({
  session: null as SessionWithId | null,
  onboard: vi.fn(),
}));

vi.mock("../../api/lib/session.js", () => ({
  requireSession: vi.fn(async (_req, res) => {
    if (!h.session) {
      res.status(401).json({ error: "Unauthorised" });
      return null;
    }
    return h.session;
  }),
}));

vi.mock("../../api/lib/csrf.js", () => ({
  requireJsonContent: () => true,
  verifyCsrf: () => true,
  ensureCsrfToken: () => "csrf",
}));

vi.mock("../../api/lib/backend/index.js", () => ({
  getBackend: () => ({ onboardProfessional: h.onboard }),
  identityFromSession: (s: SessionWithId) => ({
    userId: s.userId,
    email: s.email,
    name: s.name,
    roles: [],
  }),
}));

import handler from "../../api/professionals/onboard.js";

const SESSION: SessionWithId = {
  sessionId: "s1",
  userId: "u1",
  email: "pro@x.io",
  name: "Pro",
  onboardingComplete: true,
};

beforeEach(() => {
  h.session = SESSION;
  h.onboard.mockReset();
});

describe("POST /api/professionals/onboard", () => {
  it("rejects non-POST methods with 405", async () => {
    const res = mockRes();
    await handler(mockReq({ method: "GET" }), res);
    expect(res._status).toBe(405);
  });

  it("returns 401 when unauthenticated", async () => {
    h.session = null;
    const res = mockRes();
    await handler(
      mockReq({ method: "POST", body: { profession: "backend_engineer" } }),
      res
    );
    expect(res._status).toBe(401);
    expect(h.onboard).not.toHaveBeenCalled();
  });

  it("rejects an unknown profession with 400", async () => {
    const res = mockRes();
    await handler(mockReq({ method: "POST", body: { profession: "wizard" } }), res);
    expect(res._status).toBe(400);
    expect(h.onboard).not.toHaveBeenCalled();
  });

  it("derives the Partner role and forwards to the backend on success", async () => {
    h.onboard.mockResolvedValue({ onboarded: true, status: "approved" });
    const res = mockRes();
    await handler(
      mockReq({
        method: "POST",
        body: { profession: "backend_engineer", answers: { skills: "Go" } },
      }),
      res
    );
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({ onboarded: true, status: "approved" });

    const [identity, input] = h.onboard.mock.calls[0]!;
    expect(identity.userId).toBe("u1");
    expect(input).toMatchObject({
      profession: "backend_engineer",
      roleName: "partner.backend_engineer",
      category: "Partner",
      answers: { skills: "Go" },
    });
  });
});

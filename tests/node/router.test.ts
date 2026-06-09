import { describe, it, expect } from "vitest";
import { mockReq, mockRes } from "./helpers.js";
import router from "../../api/router.js";

/**
 * The single `/api/*` serverless function dispatches by path to the handlers
 * under `server/`. In production a `vercel.json` rewrite delivers the path as
 * the `__route` query param (`/api/auth/session` → `__route=auth/session`);
 * these tests drive it the same way, plus the `req.url` fallback.
 *
 * Assertions stay DB/Redis-free: `csrf` needs neither, and `requireSession`
 * returns 401 without touching Redis when there's no session cookie — enough to
 * prove the route matched and delegated.
 */

function call(route: string, init: Parameters<typeof mockReq>[0] = {}) {
  const req = mockReq({ query: { __route: route }, ...init });
  const res = mockRes();
  return { req, res, done: router(req, res) };
}

describe("/api router dispatch", () => {
  it("404s an unknown path", async () => {
    const { res, done } = call("does/not/exist");
    await done;
    expect(res._status).toBe(404);
    expect(res._json).toMatchObject({ error: "Not found" });
  });

  it("dispatches a static route and returns its response (csrf GET → 200)", async () => {
    const { res, done } = call("csrf", { method: "GET" });
    await done;
    expect(res._status).toBe(200);
    expect((res._json as { csrfToken?: string }).csrfToken).toBeTypeOf("string");
  });

  it("preserves each handler's own method check (csrf PUT → 405)", async () => {
    const { res, done } = call("csrf", { method: "PUT" });
    await done;
    expect(res._status).toBe(405);
  });

  it("matches a 3-segment dynamic route and injects :id (mwa/inbox/:id)", async () => {
    const { req, res, done } = call("mwa/inbox/abc123", { method: "GET" });
    await done;
    expect(req.query["id"]).toBe("abc123"); // param injected as a plain string
    expect(res._status).toBe(401); // requireSession, no cookie → 401 (route reached)
  });

  it("prefers the 4-segment route over the 3-segment one (…/:id/actions)", async () => {
    const { req, res, done } = call("mwa/inbox/abc123/actions", { method: "POST" });
    await done;
    expect(req.query["id"]).toBe("abc123");
    expect(res._status).toBe(401); // reached mwaInboxActions, not the :id handler
  });

  it("falls back to parsing req.url when __route is absent", async () => {
    const req = mockReq({ method: "GET", url: "/api/csrf", query: {} });
    const res = mockRes();
    await router(req, res);
    expect(res._status).toBe(200);
    expect((res._json as { csrfToken?: string }).csrfToken).toBeTypeOf("string");
  });
});

import { describe, it, expect } from "vitest";
import {
  verifyCsrf,
  requireJsonContent,
  ensureCsrfToken,
  CSRF_COOKIE,
  CSRF_HEADER,
} from "../../api/lib/csrf.js";
import { mockReq, mockRes } from "./helpers.js";

describe("verifyCsrf", () => {
  it("passes safe methods without a token", () => {
    expect(verifyCsrf(mockReq({ method: "GET" }), mockRes())).toBe(true);
    expect(verifyCsrf(mockReq({ method: "HEAD" }), mockRes())).toBe(true);
  });

  it("accepts a matching double-submit token", () => {
    const token = "a".repeat(64);
    const req = mockReq({
      method: "POST",
      headers: { cookie: `${CSRF_COOKIE}=${token}`, [CSRF_HEADER]: token },
    });
    expect(verifyCsrf(req, mockRes())).toBe(true);
  });

  it("rejects a mismatched token with 403", () => {
    const req = mockReq({
      method: "POST",
      headers: { cookie: `${CSRF_COOKIE}=${"a".repeat(64)}`, [CSRF_HEADER]: "b".repeat(64) },
    });
    const res = mockRes();
    expect(verifyCsrf(req, res)).toBe(false);
    expect(res._status).toBe(403);
  });

  it("rejects when the header token is missing", () => {
    const req = mockReq({
      method: "POST",
      headers: { cookie: `${CSRF_COOKIE}=${"a".repeat(64)}` },
    });
    const res = mockRes();
    expect(verifyCsrf(req, res)).toBe(false);
    expect(res._status).toBe(403);
  });
});

describe("requireJsonContent", () => {
  it("accepts application/json", () => {
    const req = mockReq({ method: "POST", headers: { "content-type": "application/json" } });
    expect(requireJsonContent(req, mockRes())).toBe(true);
  });

  it("rejects a non-JSON content type with 415", () => {
    const req = mockReq({ method: "POST", headers: { "content-type": "text/plain" } });
    const res = mockRes();
    expect(requireJsonContent(req, res)).toBe(false);
    expect(res._status).toBe(415);
  });
});

describe("ensureCsrfToken", () => {
  it("reuses an existing cookie token", () => {
    const existing = "c".repeat(64);
    const req = mockReq({ headers: { cookie: `${CSRF_COOKIE}=${existing}` } });
    expect(ensureCsrfToken(req, mockRes())).toBe(existing);
  });

  it("mints + sets a new token when none exists", () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    const token = ensureCsrfToken(req, res);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const setCookie = res._headers["set-cookie"];
    expect(String(setCookie)).toContain(`${CSRF_COOKIE}=${token}`);
  });
});

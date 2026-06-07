import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RestBackend } from "../../api/lib/backend/rest.js";
import { BackendUnavailableError } from "../../api/lib/backend/contract.js";
import type { Identity } from "../../api/lib/backend/identity.js";

const ID: Identity = { userId: "u1", email: "a@b.c", name: "Ada", roles: ["partner"] };

describe("RestBackend", () => {
  const savedUrl = process.env["BACKEND_REST_URL"];
  beforeEach(() => {
    process.env["BACKEND_REST_URL"] = "https://backend.test/api/";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (savedUrl === undefined) delete process.env["BACKEND_REST_URL"];
    else process.env["BACKEND_REST_URL"] = savedUrl;
  });

  it("POSTs onboarding with a bearer identity token and returns the parsed body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ onboarded: true, status: "approved" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = await new RestBackend().onboardProfessional(ID, {
      profession: "backend_engineer",
      roleName: "partner.backend_engineer",
      category: "Partner",
      answers: {},
    });
    expect(out).toMatchObject({ onboarded: true, status: "approved" });

    const [url, opts] = fetchMock.mock.calls[0]!;
    // Trailing slash on BACKEND_REST_URL is trimmed.
    expect(url).toBe("https://backend.test/api/professionals/onboard");
    expect(opts.method).toBe("POST");
    expect(String(opts.headers.Authorization)).toMatch(/^Bearer .+\..+$/);
  });

  it("throws BackendUnavailableError on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "down" })
    );
    await expect(new RestBackend().getProfessionalStatus(ID)).rejects.toBeInstanceOf(
      BackendUnavailableError
    );
  });

  it("throws BackendUnavailableError when BACKEND_REST_URL is unset", async () => {
    delete process.env["BACKEND_REST_URL"];
    await expect(new RestBackend().getProfessionalStatus(ID)).rejects.toThrow(
      /BACKEND_REST_URL/
    );
  });
});

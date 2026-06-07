import { describe, it, expect, afterEach } from "vitest";
import { baseUrl, readRawBody } from "../../api/lib/http.js";
import { mockReq } from "./helpers.js";

describe("baseUrl", () => {
  const saved = process.env["PUBLIC_BASE_URL"];
  afterEach(() => {
    if (saved === undefined) delete process.env["PUBLIC_BASE_URL"];
    else process.env["PUBLIC_BASE_URL"] = saved;
  });

  it("prefers PUBLIC_BASE_URL and trims trailing slashes", () => {
    process.env["PUBLIC_BASE_URL"] = "https://tokans.org///";
    expect(baseUrl(mockReq())).toBe("https://tokans.org");
  });

  it("derives from forwarded proto + host headers", () => {
    delete process.env["PUBLIC_BASE_URL"];
    const req = mockReq({
      headers: { "x-forwarded-proto": "https", host: "demo.vercel.app" },
    });
    expect(baseUrl(req)).toBe("https://demo.vercel.app");
  });

  it("defaults proto to https and host to localhost:3000", () => {
    delete process.env["PUBLIC_BASE_URL"];
    expect(baseUrl(mockReq({ headers: {} }))).toBe("https://localhost:3000");
  });
});

describe("readRawBody", () => {
  it("returns a string body verbatim", async () => {
    const req = mockReq({ body: '{"a":1}' } as never);
    expect(await readRawBody(req)).toBe('{"a":1}');
  });

  it("stringifies an already-parsed object body", async () => {
    const req = mockReq({ body: { a: 1 } } as never);
    expect(await readRawBody(req)).toBe('{"a":1}');
  });

  it("decodes a Buffer body", async () => {
    const req = mockReq({ body: Buffer.from("raw-bytes") } as never);
    expect(await readRawBody(req)).toBe("raw-bytes");
  });
});

import { vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * A fake Neon `sql` tagged-template. Returns queued responses in FIFO order
 * (defaulting to []), while recording every executed query for assertions.
 */
export interface FakeSql {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
  /** Recorded calls: the collapsed SQL text + the interpolated values. */
  calls: { text: string; values: unknown[] }[];
}

export function makeFakeSql(responses: unknown[][] = []): FakeSql {
  const queue = [...responses];
  const fn = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    fn.calls.push({ text: strings.join("?").replace(/\s+/g, " ").trim(), values });
    return Promise.resolve(queue.shift() ?? []);
  }) as FakeSql;
  fn.calls = [];
  return fn;
}

/** Minimal VercelRequest stub. */
export function mockReq(init: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "GET",
    headers: {},
    query: {},
    cookies: {},
    body: undefined,
    url: "/",
    ...init,
  } as unknown as VercelRequest;
}

export interface CapturedRes extends VercelResponse {
  _status: number;
  _json: unknown;
  _headers: Record<string, string | string[]>;
}

/** VercelResponse stub that captures status/json/headers. */
export function mockRes(): CapturedRes {
  const res = {
    _status: 200,
    _json: undefined as unknown,
    _headers: {} as Record<string, string | string[]>,
    headersSent: false,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(payload: unknown) {
      this._json = payload;
      this.headersSent = true;
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this._headers[name.toLowerCase()] = value;
      return this;
    },
    getHeader(name: string) {
      return this._headers[name.toLowerCase()];
    },
    end() {
      this.headersSent = true;
      return this;
    },
  };
  return res as unknown as CapturedRes;
}

/** Silence console.error for a test that intentionally triggers a logged error. */
export function muteConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => undefined);
}

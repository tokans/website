import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

// Permissive api mock — App checks the session on mount and routes from there.
const { api } = vi.hoisted(() => ({
  api: {
    initCsrf: vi.fn().mockResolvedValue(null),
    session: vi.fn().mockResolvedValue({ authenticated: false }),
    logout: vi.fn().mockResolvedValue({ ok: true }),
  },
}));
vi.mock("../../src/api.js", () => ({ api }));

import App from "../../src/App.js";

// jsdom can't navigate; model window.location as a plain writable object so
// App's redirect (window.location.href = …) is observable and accepts a
// relative URL (a real Location.href setter would reject "/login").
function setLocation(path: string) {
  const url = new URL(`http://localhost${path}`);
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { pathname: url.pathname, search: url.search, href: `http://localhost${path}` },
  });
}

beforeEach(() => {
  Object.values(api).forEach((f) => "mockClear" in f && f.mockClear());
  api.session.mockResolvedValue({ authenticated: false });
  setLocation("/app");
});

describe("App (post-login host)", () => {
  it("checks the session on mount", async () => {
    render(<App />);
    await waitFor(() => expect(api.session).toHaveBeenCalled());
  });

  it("redirects an unauthenticated visitor to /login", async () => {
    setLocation("/app");
    render(<App />);
    await waitFor(() => expect(window.location.href).toBe("/login"));
  });

  it("sends an unauthenticated /join visitor to the static /join auth page", async () => {
    setLocation("/app?flow=join");
    render(<App />);
    await waitFor(() => expect(window.location.href).toBe("/join"));
  });
});

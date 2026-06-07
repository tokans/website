import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// A permissive api mock — every screen App can route to pulls from this module.
// Built in vi.hoisted so it exists before the hoisted vi.mock factory runs.
const { api } = vi.hoisted(() => ({
  api: {
    initCsrf: vi.fn().mockResolvedValue(null),
    session: vi.fn().mockResolvedValue({ authenticated: false }),
    listApps: vi.fn().mockResolvedValue({ apps: [] }),
    listPartners: vi.fn().mockResolvedValue({ partners: [] }),
    donateCheckout: vi.fn(),
    logout: vi.fn().mockResolvedValue({ ok: true }),
  },
}));
vi.mock("../../src/api.js", () => ({ api }));

import App from "../../src/App.js";

beforeEach(() => {
  Object.values(api).forEach((f) => "mockClear" in f && f.mockClear());
  api.session.mockResolvedValue({ authenticated: false });
});

describe("App standalone routing", () => {
  it("renders the Donate screen on /donate (public, pre-auth)", async () => {
    window.history.replaceState({}, "", "/donate");
    render(<App />);
    // findBy lets React flush the mounted effects (initCsrf/session) under act.
    expect(await screen.findByText("Pay it forward")).toBeInTheDocument();
  });

  it("renders the Apps directory on /apps (public)", async () => {
    window.history.replaceState({}, "", "/apps");
    render(<App />);
    expect(
      await screen.findByText("Apps supported by professionals")
    ).toBeInTheDocument();
  });

  it("renders the Partner directory on /partners (public)", async () => {
    window.history.replaceState({}, "", "/partners");
    render(<App />);
    expect(
      await screen.findByText("Connect with a professional")
    ).toBeInTheDocument();
  });

  it("shows the founders use-case auth panel on /founders when signed out", async () => {
    window.history.replaceState({}, "", "/founders");
    render(<App />);
    expect(await screen.findByText("FOR FOUNDERS")).toBeInTheDocument();
    expect(screen.getByText("Take your AI-built app further")).toBeInTheDocument();
  });

  it("checks the existing session for a non-public route", async () => {
    window.history.replaceState({}, "", "/");
    render(<App />);
    await waitFor(() => expect(api.session).toHaveBeenCalled());
  });
});

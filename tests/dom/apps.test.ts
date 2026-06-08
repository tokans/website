import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppListing } from "../../src/lib/types.js";

const { listApps, session, registerApp, requestAppSupport, initCsrf } = vi.hoisted(() => ({
  listApps: vi.fn(),
  session: vi.fn(),
  registerApp: vi.fn(),
  requestAppSupport: vi.fn(),
  initCsrf: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../public/js/api.js", () => ({
  api: { listApps, session, registerApp, requestAppSupport, initCsrf },
}));

import { mount, appRowHTML, appsListHTML } from "../../public/js/apps.js";

const app = (over: Partial<AppListing> = {}): AppListing => ({
  id: "a1",
  slug: "a1",
  name: "myJournal",
  tagline: null,
  repoUrl: null,
  stack: null,
  description: null,
  usesSharedCoreLib: true,
  supportStatus: "none",
  listed: false,
  isOwner: false,
  ...over,
});

function island(): HTMLElement {
  document.body.innerHTML = `<div id="apps-island"></div>`;
  return document.getElementById("apps-island")!;
}

beforeEach(() => {
  listApps.mockReset();
  session.mockReset().mockResolvedValue({ authenticated: false });
});

describe("apps island — pure render", () => {
  it("escapes the app name and rejects non-http repo URLs", () => {
    const html = appRowHTML(app({ name: "<img src=x>", repoUrl: "javascript:alert(1)" }));
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&lt;img");
    // javascript: URL collapses to empty → no repo link rendered.
    expect(html).not.toContain("repo ↗");
  });

  it("renders a safe http repo link", () => {
    const html = appRowHTML(app({ repoUrl: "https://github.com/me/app" }));
    expect(html).toContain('href="https://github.com/me/app"');
    expect(html).toContain("repo ↗");
  });

  it("shows the empty state", () => {
    expect(appsListHTML([])).toContain("No apps listed yet");
  });
});

describe("apps island — mounted behaviour", () => {
  it("renders the directory and a sign-in prompt for signed-out visitors", async () => {
    listApps.mockResolvedValue({ apps: [app({ name: "DirApp" })] });
    const root = island();
    mount();
    await vi.waitFor(() => expect(root.textContent).toContain("DirApp"));
    await vi.waitFor(() => expect(root.textContent).toContain("Sign in"));
    expect(root.querySelector("#app-register")).toBeNull();
  });

  it("shows the owner registration form when signed in", async () => {
    session.mockResolvedValue({ authenticated: true, user: { id: "me" } });
    listApps.mockResolvedValue({ apps: [] });
    const root = island();
    mount();
    await vi.waitFor(() => expect(root.querySelector("#app-register")).not.toBeNull());
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AppListing } from "../../src/lib/types.js";

const { listApps } = vi.hoisted(() => ({
  listApps: vi.fn(),
}));
vi.mock("../../public/js/api.js", () => ({
  api: { listApps },
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
  iconUrl: null,
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

  it("renders the app icon when iconUrl is a safe same-origin path", () => {
    const html = appRowHTML(app({ iconUrl: "/app-icons/myjournal.png" }));
    expect(html).toContain('src="/app-icons/myjournal.png"');
  });

  it("falls back to a letter badge when there is no icon", () => {
    const html = appRowHTML(app({ name: "Zephyr", iconUrl: null }));
    expect(html).not.toContain("<img");
    expect(html).toContain(">Z<");
  });

  it("ignores an off-origin or malformed iconUrl", () => {
    const html = appRowHTML(app({ iconUrl: "https://evil.example/x.png" }));
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("<img");
  });

  it("shows the empty state", () => {
    expect(appsListHTML([])).toContain("No apps listed yet");
  });
});

describe("apps island — mounted behaviour", () => {
  it("renders the directory and a 'list your app' CTA to /founders", async () => {
    listApps.mockResolvedValue({ apps: [app({ name: "DirApp" })] });
    const root = island();
    mount();
    await vi.waitFor(() => expect(root.textContent).toContain("DirApp"));
    const cta = root.querySelector<HTMLAnchorElement>(".dir-cta a");
    expect(cta?.getAttribute("href")).toBe("/founders");
    expect(cta?.textContent).toContain("List your app");
    // The in-deck owner registration form is gone — listing is the CTA now.
    expect(root.querySelector("#app-register")).toBeNull();
  });

  it("shows the empty state when no apps are listed, CTA still present", async () => {
    listApps.mockResolvedValue({ apps: [] });
    const root = island();
    mount();
    await vi.waitFor(() => expect(root.textContent).toContain("No apps listed yet"));
    expect(root.querySelector<HTMLAnchorElement>(".dir-cta a")?.getAttribute("href")).toBe("/founders");
  });
});

import { describe, it, expect } from "vitest";
import type { AppListing } from "../../src/lib/types.js";
import { detectOs, pickDownloads, appDetailHTML } from "../../public/js/app-detail.js";

const app = (over: Partial<AppListing> = {}): AppListing => ({
  id: "a1",
  slug: "myfinance",
  name: "myFinance",
  tagline: "Your money, on your machine.",
  repoUrl: null,
  stack: null,
  description: null,
  iconUrl: null,
  usesSharedCoreLib: true,
  supportStatus: "listed",
  listed: true,
  isOwner: false,
  content: null,
  ...over,
});

const DOWNLOADS = [
  { os: "windows" as const, label: "Windows (.msi)", url: "https://ex.com/app.msi" },
  { os: "macos" as const, label: "macOS", url: "https://ex.com/app.dmg" },
];

describe("detectOs", () => {
  it("detects Windows / macOS / Linux from the platform string", () => {
    expect(detectOs({ platform: "Win32" })).toBe("windows");
    expect(detectOs({ platform: "MacIntel" })).toBe("macos");
    expect(detectOs({ platform: "Linux x86_64" })).toBe("linux");
  });
  it("falls back to the user-agent and returns null when unknown", () => {
    expect(detectOs({ userAgent: "Mozilla/5.0 (Windows NT 10.0)" })).toBe("windows");
    expect(detectOs({ platform: "", userAgent: "weird-bot" })).toBeNull();
  });
});

describe("pickDownloads", () => {
  it("features the entry matching the visitor's OS and lists the rest", () => {
    const { primary, others } = pickDownloads(DOWNLOADS, "macos");
    expect(primary?.os).toBe("macos");
    expect(others.map((d) => d.os)).toEqual(["windows"]);
  });
  it("treats every platform as 'other' when there is no OS match", () => {
    const { primary, others } = pickDownloads(DOWNLOADS, "linux");
    expect(primary).toBeNull();
    expect(others).toHaveLength(2);
  });
  it("drops downloads with unsafe URLs", () => {
    const { others } = pickDownloads(
      [{ os: "windows" as const, label: "x", url: "javascript:alert(1)" }],
      null,
    );
    expect(others).toHaveLength(0);
  });
});

describe("appDetailHTML", () => {
  it("escapes the app name and only renders safe repo links", () => {
    const html = appDetailHTML(app({ name: "<b>x</b>", repoUrl: "javascript:alert(1)" }));
    expect(html).not.toContain("<b>x</b>");
    expect(html).toContain("&lt;b&gt;x");
    expect(html).not.toContain("View on GitHub");
  });

  it("renders features and the demo player from content", () => {
    const html = appDetailHTML(
      app({
        content: {
          features: [{ icon: "📊", title: "Net worth", body: "Track it." }],
          demo: { videoUrl: "https://ex.com/demo.mp4", caption: "A demo." },
          downloads: DOWNLOADS,
        },
      }),
    );
    expect(html).toContain("Net worth");
    expect(html).toContain('src="https://ex.com/demo.mp4"');
    // At least one download button is present.
    expect(html).toContain("app.msi");
  });
});

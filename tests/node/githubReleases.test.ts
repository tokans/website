import { describe, it, expect } from "vitest";
import { pickAssetForOs, type ReleaseAsset } from "../../server/lib/githubReleases.js";

const ASSETS: ReleaseAsset[] = [
  { name: "myFinance_1.2.0_x64_en-US.msi", url: "https://gh/msi" },
  { name: "myFinance_1.2.0_universal.dmg", url: "https://gh/dmg" },
  { name: "myFinance_1.2.0_amd64.AppImage", url: "https://gh/appimage" },
  { name: "app-universal-debug.apk", url: "https://gh/apk" },
  { name: "latest.json", url: "https://gh/json" },
];

describe("pickAssetForOs", () => {
  it("matches the platform installer regardless of the version in the filename", () => {
    expect(pickAssetForOs(ASSETS, "windows")?.url).toBe("https://gh/msi");
    expect(pickAssetForOs(ASSETS, "macos")?.url).toBe("https://gh/dmg");
    expect(pickAssetForOs(ASSETS, "linux")?.url).toBe("https://gh/appimage");
    expect(pickAssetForOs(ASSETS, "android")?.url).toBe("https://gh/apk");
  });

  it("prefers .msi over a bare .exe for Windows", () => {
    const assets: ReleaseAsset[] = [
      { name: "setup.exe", url: "https://gh/exe" },
      { name: "app_2.0.0_x64_en-US.msi", url: "https://gh/msi" },
    ];
    expect(pickAssetForOs(assets, "windows")?.url).toBe("https://gh/msi");
  });

  it("returns null when no asset matches the platform", () => {
    expect(pickAssetForOs([{ name: "notes.txt", url: "https://gh/txt" }], "windows")).toBeNull();
    expect(pickAssetForOs([], "macos")).toBeNull();
  });
});

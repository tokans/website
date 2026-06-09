import { describe, it, expect, beforeEach, vi } from "vitest";
import SAMPLE_PARTNERS from "../../public/data/sampleProfessionals.json";
import PROFESSIONS from "../../public/data/professions.json";

const { listPartners, session, connect, initCsrf } = vi.hoisted(() => ({
  listPartners: vi.fn(),
  session: vi.fn(),
  connect: vi.fn(),
  initCsrf: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../public/js/api.js", () => ({ api: { listPartners, session, connect, initCsrf } }));

import { mount, partnerRowHTML } from "../../public/js/partners.js";

function island(): HTMLElement {
  document.body.innerHTML = `<div id="partners-island"></div>`;
  return document.getElementById("partners-island")!;
}

beforeEach(() => {
  listPartners.mockReset();
  connect.mockReset();
  session.mockReset().mockResolvedValue({ authenticated: false });
  // The island loads its profession labels + sample fallback from JSON at runtime.
  global.fetch = vi.fn((url: RequestInfo | URL) => {
    const u = String(url);
    const body = u.includes("professions")
      ? PROFESSIONS
      : u.includes("sampleProfessionals")
        ? SAMPLE_PARTNERS
        : {};
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
  }) as typeof fetch;
});

describe("partners island — pure render", () => {
  it("escapes user-provided content (no HTML injection)", () => {
    const html = partnerRowHTML(
      {
        id: "x",
        professionalUserId: "u",
        name: "<script>alert(1)</script>",
        headline: "a & b",
        profession: null,
        skills: ["<b>"],
        roleCategory: "Partner",
      },
      { authed: false, sent: false, open: false },
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a &amp; b");
  });
});

describe("partners island — mounted behaviour", () => {
  it("falls back to the sample professionals when the backend returns none", async () => {
    listPartners.mockResolvedValue({ partners: [] });
    const root = island();
    mount();
    await vi.waitFor(() => expect(root.textContent).toContain(SAMPLE_PARTNERS[0]!.name!));
    expect(root.textContent).toContain(SAMPLE_PARTNERS[4]!.name!);
    await vi.waitFor(() => expect(root.textContent).toContain("Designer (UI/UX)"));
  });

  it("renders a 'get listed' CTA to /professionals below the carousel", async () => {
    listPartners.mockResolvedValue({ partners: [] });
    const root = island();
    mount();
    await vi.waitFor(() => expect(root.textContent).toContain(SAMPLE_PARTNERS[0]!.name!));
    const cta = root.querySelector<HTMLAnchorElement>(".dir-cta a");
    expect(cta?.getAttribute("href")).toBe("/professionals");
    expect(cta?.textContent).toContain("Get listed");
  });

  it("prompts signed-out visitors to sign in instead of showing Connect", async () => {
    listPartners.mockResolvedValue({ partners: [] });
    const root = island();
    mount();
    await vi.waitFor(() => expect(root.textContent).toContain(SAMPLE_PARTNERS[0]!.name!));
    expect(root.textContent).toContain("Sign in");
    expect(root.querySelector("button[data-connect]")).toBeNull();
  });

  it("uses real backend partners when present", async () => {
    listPartners.mockResolvedValue({
      partners: [
        {
          id: "real_1",
          professionalUserId: "u_real",
          name: "Real Partner",
          headline: "Live from the backend",
          profession: "software_engineer",
          skills: ["Rust"],
          roleCategory: "Partner",
        },
      ],
    });
    const root = island();
    mount();
    await vi.waitFor(() => expect(root.textContent).toContain("Real Partner"));
    expect(root.textContent).not.toContain(SAMPLE_PARTNERS[0]!.name!);
  });

  it("lets a signed-in visitor connect and send a request", async () => {
    session.mockResolvedValue({ authenticated: true, user: { id: "me" } });
    listPartners.mockResolvedValue({
      partners: [
        {
          id: "p1",
          professionalUserId: "pro_1",
          name: "Pat Pro",
          headline: "Backend",
          profession: "backend_engineer",
          skills: ["Go"],
          roleCategory: "Partner",
        },
      ],
    });
    connect.mockResolvedValue({ connectionId: "c", workItemId: "w", status: "open" });

    const root = island();
    mount();
    await vi.waitFor(() => expect(root.querySelector("button[data-connect]")).not.toBeNull());

    root.querySelector<HTMLButtonElement>('button[data-connect="p1"]')!.click();
    const ta = root.querySelector<HTMLTextAreaElement>('textarea[data-message="p1"]')!;
    ta.value = "Need help with payments";
    root.querySelector<HTMLButtonElement>('button[data-send="p1"]')!.click();

    await vi.waitFor(() =>
      expect(connect).toHaveBeenCalledWith({
        professionalUserId: "pro_1",
        message: "Need help with payments",
      }),
    );
    await vi.waitFor(() => expect(root.textContent).toContain("Request sent"));
  });
});

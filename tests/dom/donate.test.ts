import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the API module the island imports (resolves to the same module id).
const { donateCheckout, initCsrf } = vi.hoisted(() => ({
  donateCheckout: vi.fn(),
  initCsrf: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../public/js/api.js", () => ({ api: { donateCheckout, initCsrf } }));

import { mount, donateFormHTML, donateSuccessHTML } from "../../public/js/donate.js";

// jsdom can't navigate, so model window.location as a URL object whose `href`
// setter just updates the object (the island redirects via location.href).
function setLocation(path: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: new URL(`http://localhost${path}`),
  });
}

function island(): HTMLElement {
  document.body.innerHTML = `<div id="donate-island"></div>`;
  return document.getElementById("donate-island")!;
}

beforeEach(() => {
  donateCheckout.mockReset();
  setLocation("/donate");
});

describe("donate island — pure render", () => {
  it("renders the donation form with presets", () => {
    const html = donateFormHTML();
    expect(html).toContain("Choose an amount");
    expect(html).toContain("₹2,500");
  });

  it("renders the thank-you state", () => {
    expect(donateSuccessHTML()).toContain("Thank you");
  });

  it("shows the cancelled notice in the cancel variant", () => {
    expect(donateFormHTML("cancel")).toMatch(/donation was cancelled/i);
  });
});

describe("donate island — mounted behaviour", () => {
  it("renders the form into the island", () => {
    const root = island();
    mount();
    expect(root.textContent).toContain("Choose an amount");
  });

  it("creates a checkout with the rupee amount converted to minor units", async () => {
    donateCheckout.mockResolvedValue({ url: "https://pay.example/redirect" });
    const root = island();
    mount();

    const amount = root.querySelector<HTMLInputElement>("#donate-amount")!;
    amount.value = "750";
    amount.dispatchEvent(new Event("input"));
    root.querySelector<HTMLButtonElement>("#donate-submit")!.click();

    await vi.waitFor(() =>
      expect(donateCheckout).toHaveBeenCalledWith({
        amountMinor: 75000,
        currency: "INR",
        email: null,
      }),
    );
  });

  it("surfaces a checkout error", async () => {
    donateCheckout.mockRejectedValue(new Error("gateway down"));
    const root = island();
    mount();
    root.querySelector<HTMLButtonElement>("#donate-submit")!.click();
    await vi.waitFor(() => expect(root.textContent).toContain("gateway down"));
  });

  it("shows the thank-you state after a successful redirect (no checkout call)", () => {
    setLocation("/donate?status=success");
    const root = island();
    mount();
    expect(root.textContent).toContain("Thank you");
    expect(donateCheckout).not.toHaveBeenCalled();
  });

  it("shows the cancelled notice after a cancelled redirect", () => {
    setLocation("/donate?status=cancel");
    const root = island();
    mount();
    expect(root.textContent).toMatch(/donation was cancelled/i);
  });
});

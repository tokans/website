import { describe, it, expect, beforeEach } from "vitest";
import { mount, navbarHTML } from "../../public/js/chrome.js";

beforeEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("static chrome — navbarHTML", () => {
  it("renders the marketing navbar with logo, sign-in CTA and hamburger", () => {
    const html = navbarHTML();
    expect(html).toContain('id="navbar"');
    expect(html).toContain("nav-logo");
    expect(html).toContain("Sign In / Sign Up");
    expect(html).toContain('id="navHamburger"');
    // The CTA is a real link to the static auth page — no modal hooks anymore.
    expect(html).toContain('href="/login"');
    expect(html).not.toContain("data-modal-target");
  });
});

describe("static chrome — mount()", () => {
  it("replaces the header/footer slots with the shared chrome", () => {
    document.body.innerHTML = `
      <div data-chrome="header" data-back-href="/" data-back-label="Home"></div>
      <main>content</main>
      <div data-chrome="footer"></div>`;
    mount();

    expect(document.querySelector('[data-chrome="header"]')).toBeNull();
    expect(document.querySelector('[data-chrome="footer"]')).toBeNull();
    expect(document.getElementById("navbar")).not.toBeNull();
    expect(document.querySelector("footer")).not.toBeNull();
  });

  it("wires the hamburger to toggle the mobile menu", () => {
    document.body.innerHTML = `<div data-chrome="header"></div>`;
    mount();

    const burger = document.getElementById("navHamburger")!;
    const menu = document.getElementById("navMobileMenu")!;
    const backdrop = document.getElementById("navBackdrop")!;
    expect(menu.classList.contains("open")).toBe(false);

    burger.click();
    expect(menu.classList.contains("open")).toBe(true);
    expect(burger.classList.contains("active")).toBe(true);
    expect(backdrop.classList.contains("active")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    // A click on the backdrop closes it again.
    backdrop.click();
    expect(menu.classList.contains("open")).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("does nothing when there is no header slot (e.g. the React /app host)", () => {
    document.body.innerHTML = `<div id="root"></div>`;
    mount();
    expect(document.getElementById("navbar")).toBeNull();
  });
});

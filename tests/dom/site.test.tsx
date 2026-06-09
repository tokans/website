import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SiteHeader, SiteFooter, PageLayout } from "../../src/components/site.js";
import { PAGE_CONTEXTS } from "../../src/data/pageContexts.js";

describe("SiteHeader", () => {
  it("links the logo to home and shows a back link next to it", () => {
    const { container } = render(<SiteHeader />);
    const logo = container.querySelector('a[aria-label="Tokans home"]') as HTMLAnchorElement;
    expect(logo.getAttribute("href")).toBe("/");
    const back = screen.getByText("← Home") as HTMLAnchorElement;
    expect(back).toBeTruthy();
    expect(back.getAttribute("href")).toBe("/");
  });

  it("renders the top nav links", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Site" });
    expect(within(nav).getByText("Partners")).toBeInTheDocument();
    expect(within(nav).getByText("Donate")).toBeInTheDocument();
    expect(within(nav).getByText("Sign in")).toBeInTheDocument();
  });
});

describe("SiteFooter sitemap", () => {
  it("renders every sitemap column heading", () => {
    render(<SiteFooter />);
    for (const heading of ["Platform", "Find", "Connect"]) {
      expect(screen.getByText(heading)).toBeInTheDocument();
    }
  });

  it("includes key destinations in the sitemap", () => {
    render(<SiteFooter />);
    expect(screen.getByText("Partner directory")).toBeInTheDocument();
    expect(screen.getByText("Apps directory")).toBeInTheDocument();
    expect(screen.getByText("Founders — List app")).toBeInTheDocument();
  });
});

describe("PageLayout", () => {
  it("wraps content with a context panel (image + text), header and footer", () => {
    const { container } = render(
      <PageLayout content={PAGE_CONTEXTS["partners"]!}>
        <div>page body here</div>
      </PageLayout>
    );
    // Header + footer chrome present (shared markup from chrome.ts)
    expect(container.querySelector("header")).toBeTruthy();
    expect(container.querySelector("footer")).toBeTruthy();
    // Context panel image + copy
    const img = screen.getByAltText(PAGE_CONTEXTS["partners"]!.imageAlt) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(PAGE_CONTEXTS["partners"]!.image);
    expect(screen.getByText(PAGE_CONTEXTS["partners"]!.title)).toBeInTheDocument();
    // Children
    expect(screen.getByText("page body here")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// AuthScreen calls api.githubLogin/googleLogin; stub the module.
vi.mock("../../src/api.js", () => ({
  api: { githubLogin: vi.fn(), googleLogin: vi.fn(), signup: vi.fn(), signin: vi.fn() },
}));

import AuthScreen from "../../src/screens/AuthScreen.js";
import { AUTH_CONTEXTS } from "../../src/data/authContexts.js";

describe("AuthScreen split layout (use-case panel)", () => {
  it("renders the use-case panel beside the form when a context is given", () => {
    const ctx = AUTH_CONTEXTS["hire"]!;
    const { container } = render(
      <AuthScreen context={ctx} initialView={ctx.defaultView} onSuccess={vi.fn()} />
    );

    // Left panel content
    expect(screen.getByText(ctx.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(ctx.title)).toBeInTheDocument();
    for (const point of ctx.points) {
      expect(screen.getByText(point)).toBeInTheDocument();
    }

    // The illustration uses the context image + alt
    const img = screen.getByAltText(ctx.imageAlt) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(ctx.image);

    // The split wrapper + the form are both present
    expect(container.querySelector(".auth-split")).toBeTruthy();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("defaults each role-scoped entry point to the signup tab", () => {
    const ctx = AUTH_CONTEXTS["professionals"]!;
    render(<AuthScreen context={ctx} initialView={ctx.defaultView} onSuccess={vi.fn()} />);
    // Signup tab shows the Full Name field; signin would not.
    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
    expect(screen.getByText("Create account →")).toBeInTheDocument();
  });

  it("falls back to the single centered card when no context is given (modal/default)", () => {
    const { container } = render(<AuthScreen onSuccess={vi.fn()} initialView="login" />);
    expect(container.querySelector(".auth-split")).toBeNull();
    expect(container.querySelector(".auth-wrap")).toBeTruthy();
  });
});

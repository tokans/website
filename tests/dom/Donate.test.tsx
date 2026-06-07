import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the API module the screen imports (resolves to the same module id).
// vi.hoisted runs before the hoisted vi.mock factory, so the fn is initialised.
const { donateCheckout } = vi.hoisted(() => ({ donateCheckout: vi.fn() }));
vi.mock("../../src/api.js", () => ({ api: { donateCheckout } }));

import Donate from "../../src/screens/Donate.js";

// jsdom can't actually navigate, so model window.location as a URL object whose
// `href` setter just updates the object (the screen redirects via location.href).
function setLocation(path: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: new URL(`http://localhost${path}`),
  });
}

beforeEach(() => {
  donateCheckout.mockReset();
  setLocation("/donate");
});

describe("Donate screen", () => {
  it("renders the donation form with presets", () => {
    render(<Donate />);
    expect(screen.getByText("Choose an amount")).toBeInTheDocument();
    expect(screen.getByText("₹2,500")).toBeInTheDocument();
  });

  it("creates a checkout with the rupee amount converted to minor units", async () => {
    donateCheckout.mockResolvedValue({ url: "https://pay.example/redirect" });
    render(<Donate />);

    const amount = screen.getByPlaceholderText(/Minimum ₹50/);
    fireEvent.change(amount, { target: { value: "750" } });
    fireEvent.click(screen.getByText(/Donate ₹750/));

    await waitFor(() =>
      expect(donateCheckout).toHaveBeenCalledWith({
        amountMinor: 75000,
        currency: "INR",
        email: null,
      })
    );
  });

  it("surfaces a checkout error", async () => {
    donateCheckout.mockRejectedValue(new Error("gateway down"));
    render(<Donate />);
    fireEvent.click(screen.getByText(/Donate ₹/));
    expect(await screen.findByText("gateway down")).toBeInTheDocument();
  });

  it("shows the thank-you state after a successful redirect", () => {
    setLocation("/donate?status=success");
    render(<Donate />);
    expect(screen.getByText("Thank you")).toBeInTheDocument();
    expect(donateCheckout).not.toHaveBeenCalled();
  });

  it("shows the cancelled notice after a cancelled redirect", () => {
    setLocation("/donate?status=cancel");
    render(<Donate />);
    expect(screen.getByText(/donation was cancelled/i)).toBeInTheDocument();
  });
});

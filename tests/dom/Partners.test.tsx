import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { listPartners, session, connect } = vi.hoisted(() => ({
  listPartners: vi.fn(),
  session: vi.fn(),
  connect: vi.fn(),
}));
vi.mock("../../src/api.js", () => ({ api: { listPartners, session, connect } }));

import Partners from "../../src/screens/Partners.js";
import { SAMPLE_PARTNERS } from "../../src/data/sampleProfessionals.js";

beforeEach(() => {
  listPartners.mockReset();
  session.mockReset().mockResolvedValue({ authenticated: false });
});

describe("Partners directory", () => {
  it("falls back to the sample professionals when the backend returns none", async () => {
    listPartners.mockResolvedValue({ partners: [] });
    render(<Partners />);
    // Professionals of all types should appear from the sample data.
    expect(await screen.findByText(SAMPLE_PARTNERS[0]!.name!)).toBeInTheDocument();
    expect(screen.getByText(SAMPLE_PARTNERS[4]!.name!)).toBeInTheDocument();
    // Covers a spread of professions (a designer is in the sample set).
    expect(screen.getByText("Designer (UI/UX)")).toBeInTheDocument();
  });

  it("prompts signed-out visitors to sign in before connecting", async () => {
    listPartners.mockResolvedValue({ partners: [] });
    render(<Partners />);
    await screen.findByText(SAMPLE_PARTNERS[0]!.name!);
    // Each card shows a sign-in prompt (no Connect button when signed out).
    expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0);
    expect(screen.queryByText("Connect →")).toBeNull();
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
    render(<Partners />);
    expect(await screen.findByText("Real Partner")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(SAMPLE_PARTNERS[0]!.name!)).toBeNull()
    );
  });
});

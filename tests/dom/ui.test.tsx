import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Wordmark,
  ProgressBar,
  InfoBox,
  Field,
  BtnPrimary,
  Textarea,
  BarrierBox,
} from "../../src/components/ui.js";

describe("ui primitives", () => {
  it("renders the wordmark with its accent", () => {
    render(<Wordmark />);
    expect(screen.getByText("ans")).toBeInTheDocument();
  });

  it("computes the progress fill percentage", () => {
    const { container } = render(<ProgressBar value={1} total={4} label="Step 1 of 4" />);
    const fill = container.querySelector(".ui-progress-fill") as HTMLElement;
    expect(fill.style.getPropertyValue("--ui-progress-pct")).toBe("25%");
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("applies the variant class on an InfoBox", () => {
    const { container } = render(<InfoBox variant="error">Bad</InfoBox>);
    expect(container.querySelector(".ui-info--error")).toBeTruthy();
  });

  it("shows label, hint and error on a Field", () => {
    render(
      <Field label="Email" hint="optional" error="required">
        <input />
      </Field>
    );
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("optional")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
  });

  it("fires onClick on a primary button and respects disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(<BtnPrimary onClick={onClick}>Go</BtnPrimary>);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledOnce();

    rerender(
      <BtnPrimary onClick={onClick} disabled>
        Go
      </BtnPrimary>
    );
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledOnce(); // still once — disabled blocks it
  });

  it("renders a character counter on a Textarea with maxLength", () => {
    render(<Textarea value="hello" onChange={() => {}} maxLength={160} />);
    expect(screen.getByText("5 / 160")).toBeInTheDocument();
  });

  it("renders a numbered barrier list", () => {
    render(<BarrierBox title="Steps" steps={["first", "second"]} />);
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
  });
});

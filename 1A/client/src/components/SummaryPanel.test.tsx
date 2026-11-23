import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryPanel } from "./SummaryPanel";

const content = {
  keyPoints: ["Key point one."],
  findings: ["Finding one."],
  conclusions: ["Conclusion one."],
};

describe("SummaryPanel", () => {
  it("renders key points, findings, and conclusions as distinct sections", () => {
    render(<SummaryPanel content={content} isLoading={false} />);

    expect(screen.getByRole("heading", { name: /key points/i })).toBeInTheDocument();
    expect(screen.getByText("Key point one.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /findings/i })).toBeInTheDocument();
    expect(screen.getByText("Finding one.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /conclusions/i })).toBeInTheDocument();
    expect(screen.getByText("Conclusion one.")).toBeInTheDocument();
  });

  it("announces loading and error states without displaying an incomplete summary", () => {
    const { rerender } = render(<SummaryPanel content={null} isLoading error={null} />);

    expect(screen.getByRole("status")).toHaveTextContent(/generating/i);

    rerender(
      <SummaryPanel
        content={null}
        isLoading={false}
        error="Summary generation failed. Try again."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/try again/i);
    expect(screen.queryByRole("heading", { name: /key points/i })).not.toBeInTheDocument();
  });
});

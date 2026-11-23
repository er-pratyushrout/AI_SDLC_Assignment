import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileUpload } from "./FileUpload";

describe("FileUpload", () => {
  it("submits a supported PDF through the labeled file input", async () => {
    const user = userEvent.setup();
    const onFileSelected = vi.fn();
    render(<FileUpload onFileSelected={onFileSelected} />);
    const file = new File(["%PDF-1.7"], "report.pdf", { type: "application/pdf" });

    await user.upload(screen.getByLabelText(/choose a pdf/i), file);

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("shows a helpful error for files above 20 MB without submitting them", async () => {
    const user = userEvent.setup();
    const onFileSelected = vi.fn();
    render(<FileUpload onFileSelected={onFileSelected} />);
    const file = new File([new Uint8Array(20_000_001)], "large.pdf", {
      type: "application/pdf",
    });

    const startedAt = performance.now();
    await user.upload(screen.getByLabelText(/choose a pdf/i), file);

    expect(performance.now() - startedAt).toBeLessThan(2000);
    expect(screen.getByRole("alert")).toHaveTextContent(/20 MB/i);
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it("announces upload progress and server parse errors", () => {
    const { rerender } = render(<FileUpload onFileSelected={vi.fn()} isUploading />);

    expect(screen.getByRole("status")).toHaveTextContent(/uploading|extracting/i);
    expect(screen.getByLabelText(/choose a pdf/i)).toBeDisabled();

    rerender(
      <FileUpload onFileSelected={vi.fn()} error="This PDF contains no extractable text." />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/no extractable text/i);
  });
});

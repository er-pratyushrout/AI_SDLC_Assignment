import { describe, expect, it } from "vitest";
import { initialSessionState, sessionReducer, type SessionState } from "./session.reducer";

const existingSummary = {
  id: "summary-1",
  summaryType: "standard" as const,
  content: {
    keyPoints: ["Existing key point."],
    findings: ["Existing finding."],
    conclusions: ["Existing conclusion."],
  },
  generatedAt: "2026-11-23T00:00:00.000Z",
};

const stateWithSummary: SessionState = {
  ...initialSessionState,
  document: {
    id: "document-1",
    fileName: "report.pdf",
    fileSizeBytes: 1200,
    pageCount: 2,
    uploadedAt: "2026-11-23T00:00:00.000Z",
    processingStatus: "ready",
    generationStatus: "completed",
    lastErrorCode: null,
  },
  summary: existingSummary,
  uploadStatus: "ready",
  generationStatus: "completed",
};

describe("sessionReducer", () => {
  it("preserves the last successful summary when a new generation fails", () => {
    const generating = sessionReducer(stateWithSummary, {
      type: "summary-started",
      summaryType: "detailed",
    });
    const failed = sessionReducer(generating, {
      type: "summary-failed",
      message: "Summary generation failed.",
    });

    expect(failed.generationStatus).toBe("failed");
    expect(failed.summary).toBe(existingSummary);
    expect(failed.summaryError).toBe("Summary generation failed.");
  });

  it("keeps the active document available when a replacement upload fails", () => {
    const failed = sessionReducer(stateWithSummary, {
      type: "upload-failed",
      message: "The upload failed.",
    });

    expect(failed.document).toBe(stateWithSummary.document);
    expect(failed.summary).toBe(existingSummary);
  });
});

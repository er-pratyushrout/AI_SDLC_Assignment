import type { DocumentDto, SummaryDto, SummaryMode } from "../services/document-api";

export interface SessionState {
  document: DocumentDto | null;
  summary: SummaryDto | null;
  summaryType: SummaryMode;
  uploadStatus: "idle" | "uploading" | "ready" | "failed";
  generationStatus: DocumentDto["generationStatus"];
  uploadError: string | null;
  summaryError: string | null;
}

export type SessionAction =
  | { type: "upload-started" }
  | { type: "upload-succeeded"; document: DocumentDto }
  | { type: "upload-failed"; message: string }
  | { type: "summary-type-changed"; summaryType: SummaryMode }
  | { type: "summary-started"; summaryType: SummaryMode }
  | { type: "summary-succeeded"; summary: SummaryDto }
  | { type: "summary-failed"; message: string };

export const initialSessionState: SessionState = {
  document: null,
  summary: null,
  summaryType: "standard",
  uploadStatus: "idle",
  generationStatus: "idle",
  uploadError: null,
  summaryError: null,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "upload-started":
      return { ...state, uploadStatus: "uploading", uploadError: null };
    case "upload-succeeded":
      return {
        ...state,
        document: action.document,
        summary: null,
        uploadStatus: "ready",
        generationStatus: "idle",
        uploadError: null,
        summaryError: null,
      };
    case "upload-failed":
      return { ...state, uploadStatus: "failed", uploadError: action.message };
    case "summary-type-changed":
      return { ...state, summaryType: action.summaryType };
    case "summary-started":
      return {
        ...state,
        summaryType: action.summaryType,
        generationStatus: "processing",
        summaryError: null,
      };
    case "summary-succeeded":
      return {
        ...state,
        summary: action.summary,
        generationStatus: "completed",
        summaryError: null,
      };
    case "summary-failed":
      return {
        ...state,
        generationStatus: "failed",
        summaryError: action.message,
      };
  }
}

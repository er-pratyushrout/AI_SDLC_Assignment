import { apiRequest } from "./api-client";

export type SummaryMode = "brief" | "standard" | "detailed";

export interface SummaryContent {
  keyPoints: string[];
  findings: string[];
  conclusions: string[];
}

export interface DocumentDto {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number | null;
  uploadedAt: string;
  processingStatus: "ready" | "failed";
  generationStatus: "idle" | "processing" | "completed" | "failed";
  lastErrorCode: string | null;
}

export interface SummaryDto {
  id: string;
  summaryType: SummaryMode;
  content: SummaryContent;
  generatedAt: string;
}

export interface SummaryStatusDto {
  documentId: string;
  generationStatus: DocumentDto["generationStatus"];
  requestedSummaryType: SummaryMode | null;
  lastErrorCode: string | null;
  currentSummary: SummaryDto | null;
}

export function uploadDocument(file: File): Promise<DocumentDto> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<DocumentDto>("/api/documents/upload", {
    method: "POST",
    body: formData,
  });
}

export function requestSummary(
  documentId: string,
  summaryType: SummaryMode,
): Promise<SummaryStatusDto> {
  return apiRequest<SummaryStatusDto>(
    `/api/documents/${encodeURIComponent(documentId)}/summarize`,
    {
      method: "POST",
      body: JSON.stringify({ summaryType }),
    },
  );
}

export function getSummaryStatus(documentId: string): Promise<SummaryStatusDto> {
  return apiRequest<SummaryStatusDto>(`/api/documents/${encodeURIComponent(documentId)}/summary`);
}

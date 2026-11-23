import { Types } from "mongoose";
import { logError } from "../logging/logger";
import { PdfDocumentModel } from "../../models/document.model";
import { SummaryModel, type SummaryMode } from "../../models/summary.model";
import { AppError } from "../../middleware/error-handler.middleware";
import { readExtractedText } from "../pdf/extracted-text.store";
import type { SummarizationProvider, SummaryContent } from "./openai.provider";

function parseDocumentId(id: string): Types.ObjectId {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new AppError(400, "INVALID_DOCUMENT_ID", "The document ID is invalid.");
  }
  return new Types.ObjectId(id);
}

function toSummaryStatus(
  document: {
    _id: Types.ObjectId;
    generationStatus: "idle" | "processing" | "completed" | "failed";
    currentSummaryId: Types.ObjectId | null;
    lastErrorCode: string | null;
  },
  requestedSummaryType: SummaryMode | null,
  currentSummary: {
    _id: Types.ObjectId;
    summaryType: SummaryMode;
    content: SummaryContent | null;
    completedAt: Date | null;
  } | null,
) {
  return {
    documentId: document._id.toString(),
    generationStatus: document.generationStatus,
    requestedSummaryType,
    lastErrorCode: document.lastErrorCode,
    currentSummary:
      currentSummary?.content && currentSummary.completedAt
        ? {
            id: currentSummary._id.toString(),
            summaryType: currentSummary.summaryType,
            content: currentSummary.content,
            generatedAt: currentSummary.completedAt.toISOString(),
          }
        : null,
  };
}

export async function getSummaryStatus(documentId: string, sessionId: string) {
  const id = parseDocumentId(documentId);
  const document = await PdfDocumentModel.findOne({ _id: id, sessionId });
  if (!document) {
    throw new AppError(404, "DOCUMENT_NOT_FOUND", "The requested document was not found.");
  }

  const latestAttempt = await SummaryModel.findOne({ sessionId, documentId: id })
    .sort({ createdAt: -1, _id: -1 })
    .exec();
  const currentSummary = document.currentSummaryId
    ? await SummaryModel.findOne({
        _id: document.currentSummaryId,
        sessionId,
        status: "completed",
      }).exec()
    : null;

  return toSummaryStatus(document, latestAttempt?.summaryType ?? null, currentSummary);
}

async function markGenerationFailed(
  summaryId: Types.ObjectId,
  documentId: Types.ObjectId,
  sessionId: string,
  errorCode: string,
): Promise<void> {
  const completedAt = new Date();
  await Promise.all([
    SummaryModel.updateOne(
      { _id: summaryId, sessionId, status: "processing" },
      { $set: { status: "failed", errorCode, completedAt } },
    ),
    PdfDocumentModel.updateOne(
      { _id: documentId, sessionId, generationStatus: "processing" },
      { $set: { generationStatus: "failed", lastErrorCode: errorCode } },
    ),
  ]);
}

async function completeGeneration(
  summaryId: Types.ObjectId,
  documentId: Types.ObjectId,
  sessionId: string,
  extractedTextFileId: Types.ObjectId,
  summaryType: SummaryMode,
  provider: SummarizationProvider,
  requestId: string,
): Promise<void> {
  let content: SummaryContent;
  try {
    const text = await readExtractedText(extractedTextFileId);
    content = await provider.summarize(text, summaryType);
  } catch (error) {
    const errorCode = error instanceof AppError ? error.code : "AI_UNAVAILABLE";
    await markGenerationFailed(summaryId, documentId, sessionId, errorCode);
    return;
  }

  const completedAt = new Date();
  try {
    await SummaryModel.updateOne(
      { _id: summaryId, sessionId, status: "processing" },
      { $set: { status: "completed", content, completedAt, errorCode: null } },
    );
    const result = await PdfDocumentModel.updateOne(
      { _id: documentId, sessionId, generationStatus: "processing" },
      {
        $set: {
          generationStatus: "completed",
          currentSummaryId: summaryId,
          lastErrorCode: null,
        },
      },
    );
    if (result.matchedCount !== 1) {
      throw new Error("The document generation state changed before summary completion.");
    }
  } catch (error) {
    logError({
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: "SUMMARY_COMPLETION_FAILED",
      statusCode: 500,
    });
  }
}

export async function startSummaryGeneration(
  documentId: string,
  sessionId: string,
  summaryType: SummaryMode,
  provider: SummarizationProvider,
  requestId: string,
) {
  const id = parseDocumentId(documentId);
  const existing = await PdfDocumentModel.findOne({ _id: id, sessionId });
  if (!existing) {
    throw new AppError(404, "DOCUMENT_NOT_FOUND", "The requested document was not found.");
  }
  if (existing.processingStatus !== "ready") {
    throw new AppError(422, "DOCUMENT_NOT_READY", "This document is not ready to summarize.");
  }
  if (existing.generationStatus === "processing") {
    throw new AppError(409, "SUMMARY_IN_PROGRESS", "A summary is already being generated.");
  }

  const claimed = await PdfDocumentModel.findOneAndUpdate(
    {
      _id: id,
      sessionId,
      processingStatus: "ready",
      generationStatus: { $ne: "processing" },
    },
    { $set: { generationStatus: "processing", lastErrorCode: null } },
    { returnDocument: "after" },
  );
  if (!claimed) {
    throw new AppError(409, "SUMMARY_IN_PROGRESS", "A summary is already being generated.");
  }

  let attempt;
  try {
    attempt = await SummaryModel.create({
      sessionId,
      documentId: id,
      summaryType,
      status: "processing",
      content: null,
      createdAt: new Date(),
      completedAt: null,
      errorCode: null,
      expiresAt: claimed.expiresAt,
    });
  } catch (error) {
    await PdfDocumentModel.updateOne(
      { _id: id, sessionId, generationStatus: "processing" },
      {
        $set: {
          generationStatus: existing.currentSummaryId ? "completed" : "idle",
        },
      },
    );
    throw error;
  }

  void completeGeneration(
    attempt._id,
    id,
    sessionId,
    claimed.extractedTextFileId,
    summaryType,
    provider,
    requestId,
  ).catch((error: unknown) => {
    logError({
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorCode: "SUMMARY_WORKER_FAILED",
      statusCode: 500,
    });
  });

  return getSummaryStatus(documentId, sessionId);
}

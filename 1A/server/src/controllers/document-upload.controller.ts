import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { PdfDocumentModel, type PdfDocument } from "../models/document.model";
import { AppError } from "../middleware/error-handler.middleware";
import { deleteExtractedText, saveExtractedText } from "../services/pdf/extracted-text.store";
import { validateAndExtractPdf } from "../services/pdf/pdf.service";

function normalizeFileName(originalName: string): string {
  const baseName = path.basename(originalName.replace(/\\/g, "/")).normalize("NFC");
  return [...baseName]
    .filter((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && codePoint >= 32 && codePoint !== 127;
    })
    .join("")
    .trim()
    .slice(0, 255);
}

function serializeDocument(document: PdfDocument) {
  return {
    id: document._id.toString(),
    fileName: document.fileName,
    fileSizeBytes: document.fileSizeBytes,
    pageCount: document.pageCount,
    uploadedAt: document.uploadedAt.toISOString(),
    processingStatus: document.processingStatus,
    generationStatus: document.generationStatus,
    lastErrorCode: document.lastErrorCode,
  };
}

async function removeTemporaryFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

export const documentUploadController: RequestHandler = async (req, res, next) => {
  const file = req.file;
  if (!file) {
    next(new AppError(400, "FILE_REQUIRED", "Choose a PDF file to upload."));
    return;
  }

  let document: PdfDocument | undefined;
  let failure: unknown;
  let hasFailure = false;
  let temporaryFileRemoved = false;
  try {
    const buffer = await readFile(file.path);
    const parsed = await validateAndExtractPdf({
      buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    await removeTemporaryFile(file.path);
    temporaryFileRemoved = true;
    const fileName = normalizeFileName(file.originalname);
    if (!fileName) {
      throw new AppError(415, "UNSUPPORTED_FILE_TYPE", "Choose a valid PDF file to continue.");
    }

    const documentId = new Types.ObjectId();
    const extractedTextFileId = await saveExtractedText(parsed.text, {
      sessionId: req.sessionId,
      documentId,
      expiresAt: req.sessionExpiresAt,
    });

    try {
      document = await PdfDocumentModel.create({
        _id: documentId,
        sessionId: req.sessionId,
        fileName,
        fileSizeBytes: file.size,
        pageCount: parsed.pageCount,
        uploadedAt: new Date(),
        processingStatus: "ready",
        extractedTextFileId,
        generationStatus: "idle",
        currentSummaryId: null,
        lastErrorCode: null,
        expiresAt: req.sessionExpiresAt,
      });
    } catch (error) {
      await deleteExtractedText(extractedTextFileId);
      throw error;
    }
  } catch (error) {
    failure = error;
    hasFailure = true;
  }

  if (!temporaryFileRemoved) {
    try {
      await removeTemporaryFile(file.path);
    } catch (error) {
      next(error);
      return;
    }
  }

  if (hasFailure) {
    next(failure);
    return;
  }

  if (!document) {
    next(new Error("PDF upload completed without a persisted document."));
    return;
  }

  res.status(201).json(serializeDocument(document));
};

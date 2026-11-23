import { model, Schema, Types, type HydratedDocument } from "mongoose";

export type DocumentProcessingStatus = "ready" | "failed";
export type DocumentGenerationStatus = "idle" | "processing" | "completed" | "failed";

export interface PdfDocumentFields {
  sessionId: string;
  fileName: string;
  fileSizeBytes: number;
  pageCount: number | null;
  uploadedAt: Date;
  processingStatus: DocumentProcessingStatus;
  extractedTextFileId: Types.ObjectId;
  generationStatus: DocumentGenerationStatus;
  currentSummaryId: Types.ObjectId | null;
  lastErrorCode: string | null;
  expiresAt: Date;
}

export type PdfDocument = HydratedDocument<PdfDocumentFields>;

const documentSchema = new Schema<PdfDocumentFields>({
  sessionId: { type: String, required: true, immutable: true },
  fileName: { type: String, required: true, maxlength: 255, trim: true },
  fileSizeBytes: {
    type: Number,
    required: true,
    min: 1,
    max: 20_000_000,
    validate: Number.isInteger,
  },
  pageCount: { type: Number, min: 1, validate: Number.isInteger, default: null },
  uploadedAt: { type: Date, required: true, default: Date.now, immutable: true },
  processingStatus: {
    type: String,
    required: true,
    enum: ["ready", "failed"],
    default: "ready",
  },
  extractedTextFileId: { type: Schema.Types.ObjectId, required: true },
  generationStatus: {
    type: String,
    required: true,
    enum: ["idle", "processing", "completed", "failed"],
    default: "idle",
  },
  currentSummaryId: { type: Schema.Types.ObjectId, default: null },
  lastErrorCode: { type: String, default: null },
  expiresAt: { type: Date, required: true, index: true },
});

documentSchema.index({ sessionId: 1, uploadedAt: -1 });
documentSchema.index({ sessionId: 1, _id: 1 });

export const PdfDocumentModel = model<PdfDocumentFields>("Document", documentSchema);

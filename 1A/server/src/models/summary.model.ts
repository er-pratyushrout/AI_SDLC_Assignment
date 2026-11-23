import { model, Schema, Types, type HydratedDocument } from "mongoose";

export type SummaryMode = "brief" | "standard" | "detailed";
export type SummaryGenerationStatus = "processing" | "completed" | "failed";

export interface SummaryContent {
  keyPoints: string[];
  findings: string[];
  conclusions: string[];
}

export interface SummaryFields {
  sessionId: string;
  documentId: Types.ObjectId;
  summaryType: SummaryMode;
  status: SummaryGenerationStatus;
  content: SummaryContent | null;
  createdAt: Date;
  completedAt: Date | null;
  errorCode: string | null;
  expiresAt: Date;
}

export type SummaryDocument = HydratedDocument<SummaryFields>;

const contentSchema = new Schema<SummaryContent>(
  {
    keyPoints: { type: [String], required: true },
    findings: { type: [String], required: true },
    conclusions: { type: [String], required: true },
  },
  { _id: false },
);

const summarySchema = new Schema<SummaryFields>({
  sessionId: { type: String, required: true, immutable: true },
  documentId: { type: Schema.Types.ObjectId, required: true, immutable: true },
  summaryType: {
    type: String,
    required: true,
    enum: ["brief", "standard", "detailed"],
  },
  status: {
    type: String,
    required: true,
    enum: ["processing", "completed", "failed"],
  },
  content: { type: contentSchema, default: null },
  createdAt: { type: Date, required: true, default: Date.now, immutable: true },
  completedAt: { type: Date, default: null },
  errorCode: { type: String, default: null },
  expiresAt: { type: Date, required: true, index: true },
});

summarySchema.index({ sessionId: 1, documentId: 1, createdAt: -1 });

export const SummaryModel = model<SummaryFields>("Summary", summarySchema);

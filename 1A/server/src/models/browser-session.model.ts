import { model, Schema, type HydratedDocument } from "mongoose";

export type BrowserSessionState = "active" | "ending" | "ended";

export interface BrowserSessionFields {
  sessionId: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
  state: BrowserSessionState;
}

export type BrowserSessionDocument = HydratedDocument<BrowserSessionFields>;

const browserSessionSchema = new Schema<BrowserSessionFields>({
  sessionId: { type: String, required: true, unique: true, immutable: true },
  createdAt: { type: Date, required: true, default: Date.now, immutable: true },
  lastActivityAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: true },
  endedAt: { type: Date, default: null },
  state: {
    type: String,
    required: true,
    enum: ["active", "ending", "ended"],
    default: "active",
  },
});

export const BrowserSession = model<BrowserSessionFields>("BrowserSession", browserSessionSchema);

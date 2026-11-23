import { Types } from "mongoose";
import {
  EXTRACTED_TEXT_BUCKET_NAME,
  getDatabase,
  getExtractedTextBucket,
} from "../../config/database";

export interface ExtractedTextMetadata {
  sessionId: string;
  documentId: Types.ObjectId;
  expiresAt: Date;
}

export async function saveExtractedText(
  text: string,
  metadata: ExtractedTextMetadata,
): Promise<Types.ObjectId> {
  const bucket = getExtractedTextBucket();
  const uploadStream = bucket.openUploadStream(`${metadata.documentId}.txt`, {
    metadata,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      uploadStream.once("error", reject);
      uploadStream.once("finish", resolve);
      uploadStream.end(text, "utf8");
    });
  } catch (error) {
    const database = getDatabase();
    await Promise.all([
      database.collection(`${EXTRACTED_TEXT_BUCKET_NAME}.files`).deleteOne({
        _id: uploadStream.id,
      }),
      database.collection(`${EXTRACTED_TEXT_BUCKET_NAME}.chunks`).deleteMany({
        files_id: uploadStream.id,
      }),
    ]);
    throw error;
  }

  return uploadStream.id as Types.ObjectId;
}

export async function readExtractedText(fileId: Types.ObjectId): Promise<string> {
  const chunks: Buffer[] = [];
  const downloadStream = getExtractedTextBucket().openDownloadStream(fileId);

  await new Promise<void>((resolve, reject) => {
    downloadStream.on("data", (chunk: Buffer | Uint8Array) => {
      chunks.push(Buffer.from(chunk));
    });
    downloadStream.once("error", reject);
    downloadStream.once("end", resolve);
  });

  return Buffer.concat(chunks).toString("utf8");
}

export async function deleteExtractedText(fileId: Types.ObjectId): Promise<void> {
  await getExtractedTextBucket().delete(fileId);
}

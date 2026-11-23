import mongoose from "mongoose";
import { GridFSBucket, type Db } from "mongodb";

export const EXTRACTED_TEXT_BUCKET_NAME = "extractedText";
let extractedTextBucket: GridFSBucket | undefined;

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("MongoDB connected without an initialized database handle.");
  }

  extractedTextBucket = new GridFSBucket(database, {
    bucketName: EXTRACTED_TEXT_BUCKET_NAME,
  });
}

export async function disconnectDatabase(): Promise<void> {
  extractedTextBucket = undefined;
  await mongoose.disconnect();
}

export function getExtractedTextBucket(): GridFSBucket {
  if (!extractedTextBucket) {
    throw new Error("The extracted text GridFS bucket is not initialized.");
  }
  return extractedTextBucket;
}

export function getDatabase(): Db {
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("The MongoDB database handle is not initialized.");
  }
  return database;
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
